# cmux — Terminal Multiplexer IA-Natif — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Rust-native GPU-accelerated terminal multiplexer with Claude Code detection, client-server architecture, and shared memory IPC.

**Architecture:** Daemon (cmux-daemon) maintains PTY processes and shared memory. GUI client (cmux-gui) reads shared memory for rendering via wgpu. CLI (cmux-cli) sends commands via named pipe. 8 crates in a Cargo workspace.

**Tech Stack:** Rust, wgpu, winit, portable-pty, vte, shared_memory, rmp-serde, clap, tokio, sysinfo, toml, tracing

**Spec:** `docs/superpowers/specs/2026-03-28-cmux-terminal-multiplexer-design.md`

---

## File Structure

```
cmux/                              # New project root (separate from mugiwara-agents)
├── Cargo.toml                     # Workspace manifest
├── Cargo.lock
├── README.md
├── .gitignore
│
├── crates/
│   ├── cmux-core/                 # Shared types & protocol
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs             # Re-exports
│   │       ├── ids.rs             # PaneId, TabId, WorkspaceId, PtyId
│   │       ├── cell.rs            # Cell, Rgb, CellFlags
│   │       ├── grid.rs            # CellGrid (cols × rows grid of cells)
│   │       ├── layout.rs          # SplitNode, Axis, SessionState, Workspace, Tab, Pane
│   │       ├── protocol.rs        # IPC messages: Command, Response, Event
│   │       └── claude.rs          # ClaudeStatus, ClaudeEvent
│   │
│   ├── cmux-shm/                  # Shared memory & ring buffers
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs             # Re-exports
│   │       ├── seqlock.rs         # SeqLock<T> — lock-free reader/writer sync
│   │       ├── ring.rs            # RingBuffer<T> — fixed-capacity circular buffer
│   │       ├── region.rs          # ShmRegion — shared memory region per PTY
│   │       └── pool.rs            # ShmPool — manages all ShmRegions
│   │
│   ├── cmux-pty/                  # PTY management & VT parsing
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs             # Re-exports
│   │       ├── manager.rs         # PtyManager — spawn, resize, kill PTYs
│   │       ├── parser.rs          # VteHandler — vte::Perform impl, writes to CellGrid
│   │       └── osc.rs             # OscInterceptor — extracts OSC sequences
│   │
│   ├── cmux-ipc/                  # Control socket & MessagePack protocol
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs             # Re-exports
│   │       ├── server.rs          # ControlServer — listens on named pipe
│   │       ├── client.rs          # ControlClient — connects to named pipe
│   │       └── codec.rs           # MessagePack encode/decode for protocol types
│   │
│   ├── cmux-daemon/               # Daemon binary
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs            # Entry point, CLI args, daemon setup
│   │       ├── app.rs             # DaemonApp — main event loop, orchestrates all subsystems
│   │       ├── registry.rs        # SessionRegistry — manages workspaces/tabs/panes state
│   │       └── persistence.rs     # StatePersistence — save/load session.json, scrollback
│   │
│   ├── cmux-gpu/                  # GPU rendering
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs             # Re-exports
│   │   │   ├── renderer.rs        # GpuRenderer — wgpu setup, render loop
│   │   │   ├── atlas.rs           # GlyphAtlas — rasterize & cache font glyphs
│   │   │   ├── pipeline.rs        # CellPipeline — wgpu render pipeline for cell grid
│   │   │   └── rect.rs            # RectPipeline — wgpu pipeline for UI rects (borders, bg)
│   │   └── shaders/
│   │       ├── cell.wgsl          # Vertex + fragment shader for terminal cells
│   │       └── rect.wgsl          # Vertex + fragment shader for solid rectangles
│   │
│   ├── cmux-gui/                  # GUI binary
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs            # Entry point, winit event loop
│   │       ├── app.rs             # GuiApp — coordinates renderer, layout, input
│   │       ├── layout.rs          # LayoutEngine — SplitTree → screen Rects
│   │       ├── input.rs           # InputHandler — winit events → keybind resolution
│   │       ├── keybinds.rs        # KeybindManager — loads keybinds.toml, matches keys
│   │       ├── widgets/
│   │       │   ├── mod.rs         # Widget trait + common types
│   │       │   ├── sidebar.rs     # Sidebar — workspace list + tab list
│   │       │   ├── statusbar.rs   # StatusBar — bottom info bar
│   │       │   ├── notification.rs # NotificationOverlay — popup notifications
│   │       │   └── palette.rs     # CommandPalette — fuzzy search command overlay
│   │       └── theme.rs           # Theme — loads theme.toml, provides colors/fonts
│   │
│   └── cmux-cli/                  # CLI binary
│       ├── Cargo.toml
│       └── src/
│           └── main.rs            # Entry point, clap commands, connects to daemon
│
├── config/                        # Default config files (installed to ~/.cmux/)
│   ├── config.toml
│   ├── keybinds.toml
│   └── theme.toml
│
└── tests/                         # Integration tests
    ├── daemon_pty_test.rs         # Daemon spawns PTY, sends input, reads output
    ├── shm_roundtrip_test.rs      # Write cells in daemon, read in "client"
    ├── ipc_commands_test.rs       # Send commands via socket, verify responses
    └── layout_test.rs             # SplitTree mutations → correct Rect calculations
```

---

## Milestone 1: Foundation (Tasks 1-4)

### Task 1: Cargo Workspace Setup

**Files:**
- Create: `cmux/Cargo.toml`
- Create: `cmux/.gitignore`
- Create: `cmux/crates/cmux-core/Cargo.toml`
- Create: `cmux/crates/cmux-core/src/lib.rs`

- [ ] **Step 1: Create project directory and git repo**

```bash
mkdir -p ~/projects/cmux
cd ~/projects/cmux
git init
```

- [ ] **Step 2: Create root Cargo.toml workspace**

Create `Cargo.toml`:

```toml
[workspace]
resolver = "2"
members = [
    "crates/cmux-core",
    "crates/cmux-shm",
    "crates/cmux-pty",
    "crates/cmux-ipc",
    "crates/cmux-daemon",
    "crates/cmux-gpu",
    "crates/cmux-gui",
    "crates/cmux-cli",
]

[workspace.package]
version = "0.1.0"
edition = "2024"
license = "MIT"
authors = ["Alexi"]

[workspace.dependencies]
# Internal crates
cmux-core = { path = "crates/cmux-core" }
cmux-shm = { path = "crates/cmux-shm" }
cmux-pty = { path = "crates/cmux-pty" }
cmux-ipc = { path = "crates/cmux-ipc" }
cmux-gpu = { path = "crates/cmux-gpu" }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rmp-serde = "1"

# Async
tokio = { version = "1", features = ["full"] }

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Config
toml = "0.8"

# CLI
clap = { version = "4", features = ["derive"] }

# Testing
assert_matches = "1"
```

- [ ] **Step 3: Create .gitignore**

Create `.gitignore`:

```
/target
Cargo.lock
*.swp
*.swo
.DS_Store
```

Note: We DO commit Cargo.lock for binaries. Remove it from .gitignore after first `cargo build`.

- [ ] **Step 4: Create cmux-core crate skeleton**

Create `crates/cmux-core/Cargo.toml`:

```toml
[package]
name = "cmux-core"
version.workspace = true
edition.workspace = true

[dependencies]
serde = { workspace = true }
```

Create `crates/cmux-core/src/lib.rs`:

```rust
pub mod ids;
pub mod cell;
pub mod grid;
pub mod layout;
pub mod protocol;
pub mod claude;
```

- [ ] **Step 5: Create empty crate skeletons for all 7 remaining crates**

For each crate (`cmux-shm`, `cmux-pty`, `cmux-ipc`, `cmux-daemon`, `cmux-gpu`, `cmux-gui`, `cmux-cli`), create a minimal `Cargo.toml` and `src/lib.rs` (or `src/main.rs` for binaries) so the workspace compiles.

`crates/cmux-shm/Cargo.toml`:
```toml
[package]
name = "cmux-shm"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
```

`crates/cmux-shm/src/lib.rs`:
```rust
// TODO: seqlock, ring buffer, shm region, pool
```

`crates/cmux-pty/Cargo.toml`:
```toml
[package]
name = "cmux-pty"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
cmux-shm = { workspace = true }
```

`crates/cmux-pty/src/lib.rs`:
```rust
// TODO: pty manager, vte parser, osc interceptor
```

`crates/cmux-ipc/Cargo.toml`:
```toml
[package]
name = "cmux-ipc"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
tokio = { workspace = true }
rmp-serde = { workspace = true }
serde = { workspace = true }
```

`crates/cmux-ipc/src/lib.rs`:
```rust
// TODO: control server, client, codec
```

`crates/cmux-daemon/Cargo.toml`:
```toml
[package]
name = "cmux-daemon"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
cmux-shm = { workspace = true }
cmux-pty = { workspace = true }
cmux-ipc = { workspace = true }
tokio = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = { workspace = true }
clap = { workspace = true }
toml = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
```

`crates/cmux-daemon/src/main.rs`:
```rust
fn main() {
    println!("cmux-daemon starting...");
}
```

`crates/cmux-gpu/Cargo.toml`:
```toml
[package]
name = "cmux-gpu"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
wgpu = "24"
```

`crates/cmux-gpu/src/lib.rs`:
```rust
// TODO: renderer, glyph atlas, cell pipeline, rect pipeline
```

`crates/cmux-gui/Cargo.toml`:
```toml
[package]
name = "cmux-gui"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
cmux-gpu = { workspace = true }
cmux-ipc = { workspace = true }
cmux-shm = { workspace = true }
winit = "0.30"
tokio = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = { workspace = true }
toml = { workspace = true }
serde = { workspace = true }
```

`crates/cmux-gui/src/main.rs`:
```rust
fn main() {
    println!("cmux-gui starting...");
}
```

`crates/cmux-cli/Cargo.toml`:
```toml
[package]
name = "cmux-cli"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
cmux-ipc = { workspace = true }
clap = { workspace = true }
tokio = { workspace = true }
rmp-serde = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
```

`crates/cmux-cli/src/main.rs`:
```rust
fn main() {
    println!("cmux cli");
}
```

- [ ] **Step 6: Verify workspace compiles**

Run: `cargo build --workspace`
Expected: All 8 crates compile with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize cargo workspace with 8 crate skeletons"
```

---

### Task 2: cmux-core — Shared Types

**Files:**
- Create: `crates/cmux-core/src/ids.rs`
- Create: `crates/cmux-core/src/cell.rs`
- Create: `crates/cmux-core/src/grid.rs`
- Create: `crates/cmux-core/src/layout.rs`
- Create: `crates/cmux-core/src/protocol.rs`
- Create: `crates/cmux-core/src/claude.rs`
- Test: `crates/cmux-core/tests/layout_test.rs`
- Test: `crates/cmux-core/tests/grid_test.rs`

- [ ] **Step 1: Write IDs module**

Create `crates/cmux-core/src/ids.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::fmt;

macro_rules! define_id {
    ($name:ident) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
        pub struct $name(pub u64);

        impl $name {
            pub fn new(val: u64) -> Self {
                Self(val)
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{}({})", stringify!($name), self.0)
            }
        }
    };
}

define_id!(PaneId);
define_id!(TabId);
define_id!(WorkspaceId);
define_id!(PtyId);

/// Monotonic ID generator.
#[derive(Debug, Default)]
pub struct IdGenerator {
    next: std::sync::atomic::AtomicU64,
}

impl IdGenerator {
    pub fn new() -> Self {
        Self {
            next: std::sync::atomic::AtomicU64::new(1),
        }
    }

    pub fn next_pane(&self) -> PaneId {
        PaneId(self.next.fetch_add(1, std::sync::atomic::Ordering::Relaxed))
    }

    pub fn next_tab(&self) -> TabId {
        TabId(self.next.fetch_add(1, std::sync::atomic::Ordering::Relaxed))
    }

    pub fn next_workspace(&self) -> WorkspaceId {
        WorkspaceId(self.next.fetch_add(1, std::sync::atomic::Ordering::Relaxed))
    }

    pub fn next_pty(&self) -> PtyId {
        PtyId(self.next.fetch_add(1, std::sync::atomic::Ordering::Relaxed))
    }
}
```

- [ ] **Step 2: Write Cell types**

Create `crates/cmux-core/src/cell.rs`:

```rust
use serde::{Deserialize, Serialize};

/// RGB color.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Rgb {
    pub const fn new(r: u8, g: u8, b: u8) -> Self {
        Self { r, g, b }
    }

    pub const WHITE: Self = Self::new(192, 202, 245); // Tokyo Night foreground
    pub const BLACK: Self = Self::new(26, 27, 38);     // Tokyo Night background
}

bitflags::bitflags! {
    /// Cell attribute flags.
    #[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
    pub struct CellFlags: u8 {
        const BOLD        = 0b0000_0001;
        const ITALIC      = 0b0000_0010;
        const UNDERLINE   = 0b0000_0100;
        const INVERSE     = 0b0000_1000;
        const STRIKETHROUGH = 0b0001_0000;
        const DIM         = 0b0010_0000;
    }
}

/// A single terminal cell.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Cell {
    /// Unicode codepoint. 0 = empty.
    pub c: char,
    pub fg: Rgb,
    pub bg: Rgb,
    pub flags: CellFlags,
}

impl Default for Cell {
    fn default() -> Self {
        Self {
            c: ' ',
            fg: Rgb::WHITE,
            bg: Rgb::BLACK,
            flags: CellFlags::empty(),
        }
    }
}

impl Cell {
    pub fn new(c: char, fg: Rgb, bg: Rgb, flags: CellFlags) -> Self {
        Self { c, fg, bg, flags }
    }

    pub fn is_empty(&self) -> bool {
        self.c == ' ' && self.flags.is_empty()
    }
}
```

Add `bitflags` to `crates/cmux-core/Cargo.toml`:

```toml
[dependencies]
serde = { workspace = true }
bitflags = { version = "2", features = ["serde"] }
```

- [ ] **Step 3: Write CellGrid**

Create `crates/cmux-core/src/grid.rs`:

```rust
use crate::cell::Cell;
use serde::{Deserialize, Serialize};

/// A rectangular grid of terminal cells.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CellGrid {
    cols: u16,
    rows: u16,
    cells: Vec<Cell>,
    /// Cursor position (col, row), 0-indexed.
    pub cursor_col: u16,
    pub cursor_row: u16,
}

impl CellGrid {
    pub fn new(cols: u16, rows: u16) -> Self {
        let size = cols as usize * rows as usize;
        Self {
            cols,
            rows,
            cells: vec![Cell::default(); size],
            cursor_col: 0,
            cursor_row: 0,
        }
    }

    pub fn cols(&self) -> u16 {
        self.cols
    }

    pub fn rows(&self) -> u16 {
        self.rows
    }

    /// Get cell at (col, row). Returns None if out of bounds.
    pub fn get(&self, col: u16, row: u16) -> Option<&Cell> {
        if col < self.cols && row < self.rows {
            Some(&self.cells[row as usize * self.cols as usize + col as usize])
        } else {
            None
        }
    }

    /// Set cell at (col, row). Returns false if out of bounds.
    pub fn set(&mut self, col: u16, row: u16, cell: Cell) -> bool {
        if col < self.cols && row < self.rows {
            self.cells[row as usize * self.cols as usize + col as usize] = cell;
            true
        } else {
            false
        }
    }

    /// Get an entire row as a slice.
    pub fn row(&self, row: u16) -> Option<&[Cell]> {
        if row < self.rows {
            let start = row as usize * self.cols as usize;
            Some(&self.cells[start..start + self.cols as usize])
        } else {
            None
        }
    }

    /// Get a mutable reference to an entire row.
    pub fn row_mut(&mut self, row: u16) -> Option<&mut [Cell]> {
        if row < self.rows {
            let start = row as usize * self.cols as usize;
            Some(&mut self.cells[start..start + self.cols as usize])
        } else {
            None
        }
    }

    /// Scroll the grid up by `n` lines. New lines at the bottom are blank.
    /// Returns the lines that scrolled off the top (for scrollback).
    pub fn scroll_up(&mut self, n: u16) -> Vec<Vec<Cell>> {
        let n = n.min(self.rows) as usize;
        let cols = self.cols as usize;
        let rows = self.rows as usize;

        // Collect lines that scroll off
        let scrolled: Vec<Vec<Cell>> = (0..n)
            .map(|r| self.cells[r * cols..(r + 1) * cols].to_vec())
            .collect();

        // Shift cells up
        self.cells.copy_within(n * cols.., 0);

        // Clear bottom lines
        let clear_start = (rows - n) * cols;
        for cell in &mut self.cells[clear_start..] {
            *cell = Cell::default();
        }

        scrolled
    }

    /// Resize the grid. Content is preserved where possible.
    pub fn resize(&mut self, new_cols: u16, new_rows: u16) {
        let mut new_cells = vec![Cell::default(); new_cols as usize * new_rows as usize];
        let copy_cols = self.cols.min(new_cols) as usize;
        let copy_rows = self.rows.min(new_rows) as usize;

        for row in 0..copy_rows {
            let src_start = row * self.cols as usize;
            let dst_start = row * new_cols as usize;
            new_cells[dst_start..dst_start + copy_cols]
                .copy_from_slice(&self.cells[src_start..src_start + copy_cols]);
        }

        self.cols = new_cols;
        self.rows = new_rows;
        self.cells = new_cells;
        self.cursor_col = self.cursor_col.min(new_cols.saturating_sub(1));
        self.cursor_row = self.cursor_row.min(new_rows.saturating_sub(1));
    }

    /// Clear the entire grid.
    pub fn clear(&mut self) {
        self.cells.fill(Cell::default());
        self.cursor_col = 0;
        self.cursor_row = 0;
    }

    /// Raw cells slice (for shm transfer).
    pub fn cells(&self) -> &[Cell] {
        &self.cells
    }
}
```

- [ ] **Step 4: Write layout types (SplitNode, Workspace, Tab, Pane)**

Create `crates/cmux-core/src/layout.rs`:

```rust
use crate::claude::ClaudeStatus;
use crate::ids::*;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Axis {
    Horizontal,
    Vertical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SplitNode {
    Leaf {
        pane_id: PaneId,
    },
    Split {
        axis: Axis,
        /// 0.0..1.0 — proportion of left/top child.
        ratio: f32,
        left: Box<SplitNode>,
        right: Box<SplitNode>,
    },
}

impl SplitNode {
    /// Create a leaf node.
    pub fn leaf(pane_id: PaneId) -> Self {
        Self::Leaf { pane_id }
    }

    /// Split this node. The current node becomes `left`, new pane becomes `right`.
    pub fn split(&mut self, axis: Axis, new_pane_id: PaneId) {
        let old = std::mem::replace(self, SplitNode::leaf(new_pane_id));
        *self = SplitNode::Split {
            axis,
            ratio: 0.5,
            left: Box::new(old),
            right: Box::new(SplitNode::leaf(new_pane_id)),
        };
    }

    /// Split a specific pane within this tree. Returns true if found.
    pub fn split_pane(&mut self, target: PaneId, axis: Axis, new_pane_id: PaneId) -> bool {
        match self {
            SplitNode::Leaf { pane_id } if *pane_id == target => {
                let old_id = *pane_id;
                *self = SplitNode::Split {
                    axis,
                    ratio: 0.5,
                    left: Box::new(SplitNode::leaf(old_id)),
                    right: Box::new(SplitNode::leaf(new_pane_id)),
                };
                true
            }
            SplitNode::Split { left, right, .. } => {
                left.split_pane(target, axis, new_pane_id)
                    || right.split_pane(target, axis, new_pane_id)
            }
            _ => false,
        }
    }

    /// Remove a pane. Returns true if found. The sibling is promoted to replace the split.
    pub fn remove_pane(&mut self, target: PaneId) -> bool {
        match self {
            SplitNode::Leaf { .. } => false,
            SplitNode::Split { left, right, .. } => {
                if matches!(left.as_ref(), SplitNode::Leaf { pane_id } if *pane_id == target) {
                    *self = *right.clone();
                    return true;
                }
                if matches!(right.as_ref(), SplitNode::Leaf { pane_id } if *pane_id == target) {
                    *self = *left.clone();
                    return true;
                }
                left.remove_pane(target) || right.remove_pane(target)
            }
        }
    }

    /// Collect all pane IDs in this tree.
    pub fn pane_ids(&self) -> Vec<PaneId> {
        match self {
            SplitNode::Leaf { pane_id } => vec![*pane_id],
            SplitNode::Split { left, right, .. } => {
                let mut ids = left.pane_ids();
                ids.extend(right.pane_ids());
                ids
            }
        }
    }

    /// Adjust the split ratio of the nearest parent of `target`. Returns true if found.
    pub fn adjust_ratio(&mut self, target: PaneId, delta: f32) -> bool {
        match self {
            SplitNode::Leaf { .. } => false,
            SplitNode::Split {
                left,
                right,
                ratio,
                ..
            } => {
                let left_has = left.pane_ids().contains(&target);
                let right_has = right.pane_ids().contains(&target);
                if left_has || right_has {
                    // Try deeper first
                    if left.adjust_ratio(target, delta) || right.adjust_ratio(target, delta) {
                        return true;
                    }
                    // This is the nearest split parent
                    *ratio = (*ratio + delta).clamp(0.1, 0.9);
                    return true;
                }
                false
            }
        }
    }
}

/// Represents a screen rectangle (in pixels or normalized coordinates).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl Rect {
    pub fn new(x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }
}

impl SplitNode {
    /// Calculate screen rectangles for all panes given a bounding rect.
    /// Returns a list of (PaneId, Rect) pairs.
    pub fn layout(&self, bounds: Rect) -> Vec<(PaneId, Rect)> {
        match self {
            SplitNode::Leaf { pane_id } => vec![(*pane_id, bounds)],
            SplitNode::Split {
                axis,
                ratio,
                left,
                right,
            } => {
                let (left_bounds, right_bounds) = match axis {
                    Axis::Vertical => {
                        let split_x = bounds.x + bounds.width * ratio;
                        (
                            Rect::new(bounds.x, bounds.y, bounds.width * ratio, bounds.height),
                            Rect::new(
                                split_x,
                                bounds.y,
                                bounds.width * (1.0 - ratio),
                                bounds.height,
                            ),
                        )
                    }
                    Axis::Horizontal => {
                        let split_y = bounds.y + bounds.height * ratio;
                        (
                            Rect::new(bounds.x, bounds.y, bounds.width, bounds.height * ratio),
                            Rect::new(
                                bounds.x,
                                split_y,
                                bounds.width,
                                bounds.height * (1.0 - ratio),
                            ),
                        )
                    }
                };
                let mut result = left.layout(left_bounds);
                result.extend(right.layout(right_bounds));
                result
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pane {
    pub id: PaneId,
    pub pty_id: PtyId,
    pub cwd: PathBuf,
    pub title: String,
    pub claude_status: Option<ClaudeStatus>,
    pub last_command: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tab {
    pub id: TabId,
    pub name: String,
    pub root: SplitNode,
    pub focused_pane: PaneId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: WorkspaceId,
    pub name: String,
    pub cwd: PathBuf,
    pub tabs: Vec<Tab>,
    pub active_tab: TabId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionState {
    pub workspaces: Vec<Workspace>,
    pub active_workspace: WorkspaceId,
}
```

- [ ] **Step 5: Write protocol types**

Create `crates/cmux-core/src/protocol.rs`:

```rust
use crate::claude::ClaudeEvent;
use crate::ids::*;
use crate::layout::Axis;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Commands sent from GUI/CLI to daemon.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Command {
    // Workspace
    NewWorkspace { name: String, cwd: PathBuf },
    CloseWorkspace { id: WorkspaceId },
    FocusWorkspace { id: WorkspaceId },

    // Tab
    NewTab { workspace_id: WorkspaceId, name: String },
    CloseTab { tab_id: TabId },
    FocusTab { tab_id: TabId },
    RenameTab { tab_id: TabId, name: String },

    // Pane
    SplitPane { pane_id: PaneId, axis: Axis },
    ClosePane { pane_id: PaneId },
    FocusPane { pane_id: PaneId },
    ResizePane { pane_id: PaneId, delta: f32 },

    // PTY I/O
    WriteInput { pane_id: PaneId, data: Vec<u8> },
    ResizePty { pane_id: PaneId, cols: u16, rows: u16 },

    // Session
    ListSessions,
    SaveSession,
    Shutdown { save: bool },

    // Events
    Subscribe { event_types: Vec<String> },
}

/// Responses from daemon to GUI/CLI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Response {
    Ok,
    Error { message: String },
    SessionState(crate::layout::SessionState),
    PaneCreated { pane_id: PaneId, pty_id: PtyId },
    TabCreated { tab_id: TabId },
    WorkspaceCreated { workspace_id: WorkspaceId },
}

/// Events pushed from daemon to subscribed clients.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Event {
    Claude(ClaudeEvent),
    PaneClosed { pane_id: PaneId },
    PaneOutput { pane_id: PaneId },
    SessionSaved,
}

/// Envelope wrapping all IPC messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Message {
    Command(Command),
    Response(Response),
    Event(Event),
}
```

- [ ] **Step 6: Write Claude types**

Create `crates/cmux-core/src/claude.rs`:

```rust
use crate::ids::PaneId;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ClaudeStatus {
    Idle,
    Thinking,
    ToolUse { tool_name: String },
    Error { message: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileAction {
    Created,
    Updated,
    Deleted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClaudeEvent {
    SessionDetected { pane_id: PaneId, pid: u32 },
    SessionEnded { pane_id: PaneId },
    StatusChanged { pane_id: PaneId, status: ClaudeStatus },
    Notification { pane_id: PaneId, title: String, body: String },
    FileModified { pane_id: PaneId, path: PathBuf, action: FileAction },
    ToolUsed { pane_id: PaneId, tool_name: String, duration_ms: u64 },
    CwdChanged { pane_id: PaneId, new_cwd: PathBuf },
}
```

- [ ] **Step 7: Update lib.rs to re-export**

Update `crates/cmux-core/src/lib.rs`:

```rust
pub mod ids;
pub mod cell;
pub mod grid;
pub mod layout;
pub mod protocol;
pub mod claude;

pub use ids::{PaneId, TabId, WorkspaceId, PtyId, IdGenerator};
pub use cell::{Cell, Rgb, CellFlags};
pub use grid::CellGrid;
pub use layout::{SplitNode, Axis, Rect, Pane, Tab, Workspace, SessionState};
pub use protocol::{Command, Response, Event, Message};
pub use claude::{ClaudeStatus, ClaudeEvent};
```

- [ ] **Step 8: Write tests for CellGrid**

Create `crates/cmux-core/tests/grid_test.rs`:

```rust
use cmux_core::{Cell, CellGrid, Rgb, CellFlags};

#[test]
fn new_grid_has_correct_dimensions() {
    let grid = CellGrid::new(80, 24);
    assert_eq!(grid.cols(), 80);
    assert_eq!(grid.rows(), 24);
}

#[test]
fn get_set_cell() {
    let mut grid = CellGrid::new(80, 24);
    let cell = Cell::new('A', Rgb::new(255, 0, 0), Rgb::BLACK, CellFlags::BOLD);
    assert!(grid.set(10, 5, cell));
    assert_eq!(grid.get(10, 5), Some(&cell));
}

#[test]
fn out_of_bounds_returns_none() {
    let grid = CellGrid::new(80, 24);
    assert_eq!(grid.get(80, 0), None);
    assert_eq!(grid.get(0, 24), None);
}

#[test]
fn scroll_up_shifts_lines() {
    let mut grid = CellGrid::new(4, 3);
    // Write 'A' on row 0, 'B' on row 1, 'C' on row 2
    grid.set(0, 0, Cell::new('A', Rgb::WHITE, Rgb::BLACK, CellFlags::empty()));
    grid.set(0, 1, Cell::new('B', Rgb::WHITE, Rgb::BLACK, CellFlags::empty()));
    grid.set(0, 2, Cell::new('C', Rgb::WHITE, Rgb::BLACK, CellFlags::empty()));

    let scrolled = grid.scroll_up(1);
    assert_eq!(scrolled.len(), 1);
    assert_eq!(scrolled[0][0].c, 'A');

    // Row 0 should now have 'B', row 1 should have 'C', row 2 should be empty
    assert_eq!(grid.get(0, 0).unwrap().c, 'B');
    assert_eq!(grid.get(0, 1).unwrap().c, 'C');
    assert!(grid.get(0, 2).unwrap().is_empty());
}

#[test]
fn resize_preserves_content() {
    let mut grid = CellGrid::new(4, 3);
    grid.set(1, 1, Cell::new('X', Rgb::WHITE, Rgb::BLACK, CellFlags::empty()));
    grid.resize(6, 4);
    assert_eq!(grid.cols(), 6);
    assert_eq!(grid.rows(), 4);
    assert_eq!(grid.get(1, 1).unwrap().c, 'X');
    // New cells should be empty
    assert!(grid.get(5, 3).unwrap().is_empty());
}
```

- [ ] **Step 9: Write tests for SplitNode layout**

Create `crates/cmux-core/tests/layout_test.rs`:

```rust
use cmux_core::{SplitNode, Axis, Rect, PaneId};

#[test]
fn leaf_layout_returns_full_bounds() {
    let node = SplitNode::leaf(PaneId::new(1));
    let bounds = Rect::new(0.0, 0.0, 800.0, 600.0);
    let result = node.layout(bounds);
    assert_eq!(result.len(), 1);
    assert_eq!(result[0].0, PaneId::new(1));
    assert_eq!(result[0].1, bounds);
}

#[test]
fn vertical_split_divides_horizontally() {
    let mut node = SplitNode::leaf(PaneId::new(1));
    node.split_pane(PaneId::new(1), Axis::Vertical, PaneId::new(2));

    let bounds = Rect::new(0.0, 0.0, 800.0, 600.0);
    let result = node.layout(bounds);
    assert_eq!(result.len(), 2);

    // Left pane: x=0, width=400
    assert_eq!(result[0].0, PaneId::new(1));
    assert!((result[0].1.width - 400.0).abs() < 0.01);

    // Right pane: x=400, width=400
    assert_eq!(result[1].0, PaneId::new(2));
    assert!((result[1].1.x - 400.0).abs() < 0.01);
    assert!((result[1].1.width - 400.0).abs() < 0.01);
}

#[test]
fn horizontal_split_divides_vertically() {
    let mut node = SplitNode::leaf(PaneId::new(1));
    node.split_pane(PaneId::new(1), Axis::Horizontal, PaneId::new(2));

    let bounds = Rect::new(0.0, 0.0, 800.0, 600.0);
    let result = node.layout(bounds);
    assert_eq!(result.len(), 2);

    // Top pane: y=0, height=300
    assert!((result[0].1.height - 300.0).abs() < 0.01);
    // Bottom pane: y=300, height=300
    assert!((result[1].1.y - 300.0).abs() < 0.01);
}

#[test]
fn remove_pane_promotes_sibling() {
    let mut node = SplitNode::leaf(PaneId::new(1));
    node.split_pane(PaneId::new(1), Axis::Vertical, PaneId::new(2));
    assert!(node.remove_pane(PaneId::new(2)));

    let ids = node.pane_ids();
    assert_eq!(ids, vec![PaneId::new(1)]);
}

#[test]
fn nested_split_layout() {
    // Create: split vertical → left leaf(1), right split horizontal → top leaf(2), bottom leaf(3)
    let mut node = SplitNode::leaf(PaneId::new(1));
    node.split_pane(PaneId::new(1), Axis::Vertical, PaneId::new(2));
    node.split_pane(PaneId::new(2), Axis::Horizontal, PaneId::new(3));

    let bounds = Rect::new(0.0, 0.0, 800.0, 600.0);
    let result = node.layout(bounds);
    assert_eq!(result.len(), 3);
    assert_eq!(result[0].0, PaneId::new(1)); // left
    assert_eq!(result[1].0, PaneId::new(2)); // top-right
    assert_eq!(result[2].0, PaneId::new(3)); // bottom-right
}

#[test]
fn adjust_ratio_clamps() {
    let mut node = SplitNode::leaf(PaneId::new(1));
    node.split_pane(PaneId::new(1), Axis::Vertical, PaneId::new(2));
    // Adjust towards left by a huge amount — should clamp to 0.1
    assert!(node.adjust_ratio(PaneId::new(1), -10.0));
    let bounds = Rect::new(0.0, 0.0, 1000.0, 1000.0);
    let result = node.layout(bounds);
    assert!((result[0].1.width - 100.0).abs() < 0.01); // 10% of 1000
}
```

- [ ] **Step 10: Run all tests**

Run: `cargo test --workspace`
Expected: All tests PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(core): add shared types — ids, cell, grid, layout, protocol, claude"
```

---

### Task 3: cmux-shm — Shared Memory & Ring Buffers

**Files:**
- Create: `crates/cmux-shm/src/seqlock.rs`
- Create: `crates/cmux-shm/src/ring.rs`
- Create: `crates/cmux-shm/src/region.rs`
- Create: `crates/cmux-shm/src/pool.rs`
- Test: `crates/cmux-shm/tests/seqlock_test.rs`
- Test: `crates/cmux-shm/tests/ring_test.rs`

- [ ] **Step 1: Add dependencies to cmux-shm**

Update `crates/cmux-shm/Cargo.toml`:

```toml
[package]
name = "cmux-shm"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }

[dev-dependencies]
assert_matches = { workspace = true }
```

Note: We implement shared memory using raw `std` primitives first (AtomicU64, UnsafeCell). The `shared_memory` crate is added in Task 3 Step 8 when we implement the actual cross-process shm region. Initially, we test with in-process memory.

- [ ] **Step 2: Write SeqLock**

Create `crates/cmux-shm/src/seqlock.rs`:

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::cell::UnsafeCell;

/// A sequence lock for single-writer, multiple-reader synchronization.
///
/// The writer increments the sequence number before and after writing.
/// Readers check the sequence number before and after reading:
/// - If the sequence changed, the read was interrupted — retry.
/// - If the sequence is odd, a write is in progress — retry.
pub struct SeqLock<T> {
    seq: AtomicU64,
    data: UnsafeCell<T>,
}

// SAFETY: SeqLock is designed for concurrent access. The writer must ensure
// exclusive write access externally (single-writer guarantee).
unsafe impl<T: Send> Send for SeqLock<T> {}
unsafe impl<T: Send> Sync for SeqLock<T> {}

impl<T: Copy> SeqLock<T> {
    pub fn new(data: T) -> Self {
        Self {
            seq: AtomicU64::new(0),
            data: UnsafeCell::new(data),
        }
    }

    /// Read the data. Retries automatically if a write was in progress.
    /// Returns the data and the sequence number at the time of the successful read.
    pub fn read(&self) -> (T, u64) {
        loop {
            let seq1 = self.seq.load(Ordering::Acquire);
            if seq1 & 1 != 0 {
                // Write in progress, spin
                std::hint::spin_loop();
                continue;
            }

            // SAFETY: No write is in progress (seq is even). We read a copy.
            let data = unsafe { *self.data.get() };

            let seq2 = self.seq.load(Ordering::Acquire);
            if seq1 == seq2 {
                return (data, seq1);
            }
            // Sequence changed during read — retry
            std::hint::spin_loop();
        }
    }

    /// Write new data. Caller MUST guarantee single-writer access.
    ///
    /// # Safety
    /// Must be called from a single writer thread only.
    pub unsafe fn write(&self, data: T) {
        // Increment to odd (signals write in progress)
        self.seq.fetch_add(1, Ordering::Release);
        // Write data
        unsafe { *self.data.get() = data };
        // Increment to even (signals write complete)
        self.seq.fetch_add(1, Ordering::Release);
    }

    /// Current sequence number.
    pub fn sequence(&self) -> u64 {
        self.seq.load(Ordering::Acquire)
    }
}
```

- [ ] **Step 3: Write tests for SeqLock**

Create `crates/cmux-shm/tests/seqlock_test.rs`:

```rust
use cmux_shm::seqlock::SeqLock;

#[test]
fn read_returns_initial_value() {
    let lock = SeqLock::new(42u64);
    let (val, seq) = lock.read();
    assert_eq!(val, 42);
    assert_eq!(seq, 0);
}

#[test]
fn write_then_read() {
    let lock = SeqLock::new(0u64);
    unsafe { lock.write(99) };
    let (val, seq) = lock.read();
    assert_eq!(val, 99);
    assert_eq!(seq, 2); // Two increments per write
}

#[test]
fn multiple_writes() {
    let lock = SeqLock::new(0u64);
    unsafe { lock.write(1) };
    unsafe { lock.write(2) };
    unsafe { lock.write(3) };
    let (val, seq) = lock.read();
    assert_eq!(val, 3);
    assert_eq!(seq, 6); // 3 writes × 2 increments
}

#[test]
fn concurrent_read_write() {
    use std::sync::Arc;
    use std::thread;

    let lock = Arc::new(SeqLock::new(0u64));
    let lock_writer = Arc::clone(&lock);

    let writer = thread::spawn(move || {
        for i in 1..=1000 {
            unsafe { lock_writer.write(i) };
        }
    });

    // Reader should never see a torn value
    let mut last = 0u64;
    for _ in 0..10_000 {
        let (val, _) = lock.read();
        assert!(val >= last, "Reader saw value go backwards: {} < {}", val, last);
        last = val;
    }

    writer.join().unwrap();
    let (val, _) = lock.read();
    assert_eq!(val, 1000);
}
```

- [ ] **Step 4: Write RingBuffer**

Create `crates/cmux-shm/src/ring.rs`:

```rust
use serde::{Deserialize, Serialize};

/// A fixed-capacity circular buffer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RingBuffer<T> {
    buf: Vec<T>,
    capacity: usize,
    /// Index where the next item will be written.
    write_pos: usize,
    /// Number of items currently stored (up to capacity).
    len: usize,
}

impl<T: Clone + Default> RingBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        Self {
            buf: vec![T::default(); capacity],
            capacity,
            write_pos: 0,
            len: 0,
        }
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Push an item to the ring buffer. Overwrites oldest if full.
    pub fn push(&mut self, item: T) {
        self.buf[self.write_pos] = item;
        self.write_pos = (self.write_pos + 1) % self.capacity;
        if self.len < self.capacity {
            self.len += 1;
        }
    }

    /// Get the i-th item from the oldest. 0 = oldest.
    pub fn get(&self, index: usize) -> Option<&T> {
        if index >= self.len {
            return None;
        }
        let start = if self.len < self.capacity {
            0
        } else {
            self.write_pos
        };
        let actual = (start + index) % self.capacity;
        Some(&self.buf[actual])
    }

    /// Iterate from oldest to newest.
    pub fn iter(&self) -> RingIter<'_, T> {
        RingIter {
            ring: self,
            pos: 0,
        }
    }

    /// Clear all items.
    pub fn clear(&mut self) {
        self.write_pos = 0;
        self.len = 0;
    }
}

pub struct RingIter<'a, T> {
    ring: &'a RingBuffer<T>,
    pos: usize,
}

impl<'a, T: Clone + Default> Iterator for RingIter<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        if self.pos >= self.ring.len {
            return None;
        }
        let item = self.ring.get(self.pos);
        self.pos += 1;
        item
    }
}
```

- [ ] **Step 5: Write tests for RingBuffer**

Create `crates/cmux-shm/tests/ring_test.rs`:

```rust
use cmux_shm::ring::RingBuffer;

#[test]
fn empty_ring() {
    let ring: RingBuffer<u32> = RingBuffer::new(5);
    assert!(ring.is_empty());
    assert_eq!(ring.len(), 0);
    assert_eq!(ring.get(0), None);
}

#[test]
fn push_and_get() {
    let mut ring: RingBuffer<u32> = RingBuffer::new(5);
    ring.push(10);
    ring.push(20);
    ring.push(30);
    assert_eq!(ring.len(), 3);
    assert_eq!(ring.get(0), Some(&10)); // oldest
    assert_eq!(ring.get(2), Some(&30)); // newest
}

#[test]
fn wraps_around() {
    let mut ring: RingBuffer<u32> = RingBuffer::new(3);
    ring.push(1);
    ring.push(2);
    ring.push(3);
    ring.push(4); // overwrites 1

    assert_eq!(ring.len(), 3);
    assert_eq!(ring.get(0), Some(&2)); // oldest is now 2
    assert_eq!(ring.get(1), Some(&3));
    assert_eq!(ring.get(2), Some(&4)); // newest
}

#[test]
fn iter_returns_oldest_to_newest() {
    let mut ring: RingBuffer<u32> = RingBuffer::new(3);
    ring.push(10);
    ring.push(20);
    ring.push(30);
    ring.push(40); // overwrites 10

    let items: Vec<&u32> = ring.iter().collect();
    assert_eq!(items, vec![&20, &30, &40]);
}

#[test]
fn clear_resets() {
    let mut ring: RingBuffer<u32> = RingBuffer::new(3);
    ring.push(1);
    ring.push(2);
    ring.clear();
    assert!(ring.is_empty());
    assert_eq!(ring.get(0), None);
}
```

- [ ] **Step 6: Write ShmRegion (in-process version for now)**

Create `crates/cmux-shm/src/region.rs`:

```rust
use crate::seqlock::SeqLock;
use cmux_core::cell::Cell;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Header for a shared memory region.
pub struct ShmHeader {
    pub write_seq: AtomicU64,
    pub cols: u16,
    pub rows: u16,
}

/// Dirty flags — one bit per row.
pub struct DirtyFlags {
    bits: Vec<AtomicU64>,
    rows: u16,
}

impl DirtyFlags {
    pub fn new(rows: u16) -> Self {
        let num_words = (rows as usize + 63) / 64;
        Self {
            bits: (0..num_words).map(|_| AtomicU64::new(0)).collect(),
            rows,
        }
    }

    /// Mark a row as dirty.
    pub fn set(&self, row: u16) {
        if row < self.rows {
            let word = row as usize / 64;
            let bit = row as usize % 64;
            self.bits[word].fetch_or(1 << bit, Ordering::Release);
        }
    }

    /// Check if a row is dirty.
    pub fn is_dirty(&self, row: u16) -> bool {
        if row >= self.rows {
            return false;
        }
        let word = row as usize / 64;
        let bit = row as usize % 64;
        self.bits[word].load(Ordering::Acquire) & (1 << bit) != 0
    }

    /// Clear all dirty flags. Returns the old flags as a Vec<bool>.
    pub fn clear_all(&self) -> Vec<bool> {
        let mut result = vec![false; self.rows as usize];
        for word_idx in 0..self.bits.len() {
            let old = self.bits[word_idx].swap(0, Ordering::AcqRel);
            for bit in 0..64 {
                let row = word_idx * 64 + bit;
                if row < self.rows as usize {
                    result[row] = old & (1 << bit) != 0;
                }
            }
        }
        result
    }
}

/// A shared memory region for one PTY's terminal content.
/// This in-process version uses Arc for testing. The cross-process
/// version will use OS shared memory.
pub struct ShmRegion {
    pub header: ShmHeader,
    /// Double buffer: buffer[0] and buffer[1]. Writer writes to active,
    /// swaps active index when done.
    cells: Vec<Cell>,
    pub dirty: DirtyFlags,
}

impl ShmRegion {
    pub fn new(cols: u16, rows: u16) -> Self {
        let size = cols as usize * rows as usize;
        Self {
            header: ShmHeader {
                write_seq: AtomicU64::new(0),
                cols,
                rows,
            },
            cells: vec![Cell::default(); size],
            dirty: DirtyFlags::new(rows),
        }
    }

    pub fn cols(&self) -> u16 {
        self.header.cols
    }

    pub fn rows(&self) -> u16 {
        self.header.rows
    }

    /// Write a row of cells (daemon-side).
    /// Caller must ensure single-writer access.
    pub fn write_row(&mut self, row: u16, cells: &[Cell]) {
        let cols = self.header.cols as usize;
        if row >= self.header.rows || cells.len() < cols {
            return;
        }
        let start = row as usize * cols;
        self.cells[start..start + cols].copy_from_slice(&cells[..cols]);
        self.dirty.set(row);
        self.header.write_seq.fetch_add(1, Ordering::Release);
    }

    /// Read a row of cells (GUI-side).
    pub fn read_row(&self, row: u16) -> Option<Vec<Cell>> {
        let cols = self.header.cols as usize;
        if row >= self.header.rows {
            return None;
        }
        let start = row as usize * cols;
        Some(self.cells[start..start + cols].to_vec())
    }

    /// Get the current write sequence number.
    pub fn write_seq(&self) -> u64 {
        self.header.write_seq.load(Ordering::Acquire)
    }

    /// Read all cells (for full-screen refresh).
    pub fn read_all(&self) -> Vec<Cell> {
        self.cells.clone()
    }
}
```

- [ ] **Step 7: Write ShmPool**

Create `crates/cmux-shm/src/pool.rs`:

```rust
use crate::region::ShmRegion;
use cmux_core::ids::PtyId;
use std::collections::HashMap;

/// Manages shared memory regions for all active PTYs.
pub struct ShmPool {
    regions: HashMap<PtyId, ShmRegion>,
}

impl ShmPool {
    pub fn new() -> Self {
        Self {
            regions: HashMap::new(),
        }
    }

    /// Create a new shared memory region for a PTY.
    pub fn create(&mut self, pty_id: PtyId, cols: u16, rows: u16) -> &mut ShmRegion {
        self.regions.insert(pty_id, ShmRegion::new(cols, rows));
        self.regions.get_mut(&pty_id).unwrap()
    }

    /// Get a mutable reference to a region.
    pub fn get_mut(&mut self, pty_id: &PtyId) -> Option<&mut ShmRegion> {
        self.regions.get_mut(pty_id)
    }

    /// Get an immutable reference to a region.
    pub fn get(&self, pty_id: &PtyId) -> Option<&ShmRegion> {
        self.regions.get(pty_id)
    }

    /// Remove a region.
    pub fn remove(&mut self, pty_id: &PtyId) -> Option<ShmRegion> {
        self.regions.remove(pty_id)
    }

    /// Number of active regions.
    pub fn len(&self) -> usize {
        self.regions.len()
    }

    pub fn is_empty(&self) -> bool {
        self.regions.is_empty()
    }
}

impl Default for ShmPool {
    fn default() -> Self {
        Self::new()
    }
}
```

- [ ] **Step 8: Update lib.rs**

Update `crates/cmux-shm/src/lib.rs`:

```rust
pub mod seqlock;
pub mod ring;
pub mod region;
pub mod pool;
```

- [ ] **Step 9: Run all tests**

Run: `cargo test --workspace`
Expected: All tests PASS (grid_test, layout_test, seqlock_test, ring_test).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(shm): add seqlock, ring buffer, shm region, and pool"
```

---

### Task 4: cmux-pty — PTY Management & VT Parsing

**Files:**
- Modify: `crates/cmux-pty/Cargo.toml`
- Create: `crates/cmux-pty/src/manager.rs`
- Create: `crates/cmux-pty/src/parser.rs`
- Create: `crates/cmux-pty/src/osc.rs`
- Test: `crates/cmux-pty/tests/parser_test.rs`
- Test: `crates/cmux-pty/tests/osc_test.rs`

- [ ] **Step 1: Add dependencies**

Update `crates/cmux-pty/Cargo.toml`:

```toml
[package]
name = "cmux-pty"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
cmux-shm = { workspace = true }
portable-pty = "0.8"
vte = "0.13"
tracing = { workspace = true }

[dev-dependencies]
assert_matches = { workspace = true }
```

- [ ] **Step 2: Write OscInterceptor**

Create `crates/cmux-pty/src/osc.rs`:

```rust
use cmux_core::claude::{ClaudeStatus, ClaudeEvent};
use cmux_core::ids::PaneId;
use std::path::PathBuf;

/// Extracted OSC data.
#[derive(Debug, Clone)]
pub enum OscData {
    /// OSC 0: Set window title.
    Title(String),
    /// OSC 7: Set current working directory.
    Cwd(PathBuf),
    /// OSC 9: Desktop notification.
    Notification(String),
    /// OSC 633: VS Code shell integration — command start.
    CommandStart(String),
    /// OSC 633: VS Code shell integration — command end.
    CommandEnd { exit_code: Option<i32> },
}

/// Parses OSC sequences from terminal output.
pub struct OscInterceptor {
    pane_id: PaneId,
}

impl OscInterceptor {
    pub fn new(pane_id: PaneId) -> Self {
        Self { pane_id }
    }

    /// Parse an OSC sequence (the bytes between ESC ] and ST/BEL).
    /// Returns parsed data if recognized.
    pub fn parse_osc(&self, params: &[&[u8]]) -> Option<OscData> {
        if params.is_empty() {
            return None;
        }

        let cmd = std::str::from_utf8(params[0]).ok()?;

        match cmd {
            // OSC 0 ; title ST — window title
            "0" if params.len() >= 2 => {
                let title = std::str::from_utf8(params[1]).ok()?.to_string();
                Some(OscData::Title(title))
            }
            // OSC 7 ; uri ST — current working directory
            "7" if params.len() >= 2 => {
                let uri = std::str::from_utf8(params[1]).ok()?;
                // Strip file:// prefix if present
                let path = uri.strip_prefix("file://").unwrap_or(uri);
                // Strip hostname if present (file://hostname/path)
                let path = if let Some(rest) = path.strip_prefix("//") {
                    rest.find('/').map(|i| &rest[i..]).unwrap_or(rest)
                } else {
                    path
                };
                Some(OscData::Cwd(PathBuf::from(path)))
            }
            // OSC 9 ; text ST — notification
            "9" if params.len() >= 2 => {
                let text = std::str::from_utf8(params[1]).ok()?.to_string();
                Some(OscData::Notification(text))
            }
            _ => None,
        }
    }
}

/// Analyzes terminal output text for Claude Code status patterns.
pub struct ClaudePatternDetector;

impl ClaudePatternDetector {
    /// Analyze a line of terminal output for Claude Code patterns.
    /// Returns a status change if detected.
    pub fn analyze_line(line: &str) -> Option<ClaudeStatus> {
        let trimmed = line.trim();

        if trimmed.contains("Thinking") || trimmed.contains("⏺") && trimmed.contains("...") {
            return Some(ClaudeStatus::Thinking);
        }

        if trimmed.starts_with("⏺ ") && trimmed.contains("tool") || trimmed.contains("Using") {
            // Extract tool name: "⏺ Using tool: Read" → "Read"
            if let Some(tool) = trimmed.split("tool:").nth(1).or(trimmed.split("Using ").nth(1)) {
                return Some(ClaudeStatus::ToolUse {
                    tool_name: tool.trim().to_string(),
                });
            }
        }

        if trimmed.starts_with("✗ ") || trimmed.starts_with("Error:") {
            let msg = trimmed
                .strip_prefix("✗ ")
                .or(trimmed.strip_prefix("Error: "))
                .unwrap_or(trimmed);
            return Some(ClaudeStatus::Error {
                message: msg.to_string(),
            });
        }

        if trimmed.starts_with("claude ›") || trimmed.ends_with("claude ›") {
            return Some(ClaudeStatus::Idle);
        }

        None
    }
}
```

- [ ] **Step 3: Write VteHandler (vte::Perform implementation)**

Create `crates/cmux-pty/src/parser.rs`:

```rust
use cmux_core::cell::{Cell, CellFlags, Rgb};
use cmux_core::grid::CellGrid;
use crate::osc::{OscInterceptor, OscData, ClaudePatternDetector};
use cmux_core::claude::ClaudeStatus;
use cmux_core::ids::PaneId;
use tracing::trace;

/// Pending events from VT parsing.
#[derive(Debug, Clone)]
pub enum ParseEvent {
    OscData(OscData),
    ClaudeStatus(ClaudeStatus),
}

/// Implements vte::Perform to write parsed terminal output into a CellGrid.
pub struct VteHandler {
    pub grid: CellGrid,
    pub osc_interceptor: OscInterceptor,
    pub events: Vec<ParseEvent>,

    // Current text attributes
    fg: Rgb,
    bg: Rgb,
    flags: CellFlags,

    // Current line buffer for pattern detection
    line_buf: String,
}

impl VteHandler {
    pub fn new(cols: u16, rows: u16, pane_id: PaneId) -> Self {
        Self {
            grid: CellGrid::new(cols, rows),
            osc_interceptor: OscInterceptor::new(pane_id),
            events: Vec::new(),
            fg: Rgb::WHITE,
            bg: Rgb::BLACK,
            flags: CellFlags::empty(),
            line_buf: String::new(),
        }
    }

    /// Take pending events (drains the queue).
    pub fn take_events(&mut self) -> Vec<ParseEvent> {
        std::mem::take(&mut self.events)
    }

    /// Get scrollback lines that scrolled off the top.
    fn check_line_patterns(&mut self) {
        if !self.line_buf.is_empty() {
            if let Some(status) = ClaudePatternDetector::analyze_line(&self.line_buf) {
                self.events.push(ParseEvent::ClaudeStatus(status));
            }
        }
    }
}

impl vte::Perform for VteHandler {
    fn print(&mut self, c: char) {
        let col = self.grid.cursor_col;
        let row = self.grid.cursor_row;
        let cell = Cell::new(c, self.fg, self.bg, self.flags);
        self.grid.set(col, row, cell);

        self.line_buf.push(c);

        // Advance cursor
        if self.grid.cursor_col + 1 < self.grid.cols() {
            self.grid.cursor_col += 1;
        } else {
            // Line wrap
            self.grid.cursor_col = 0;
            if self.grid.cursor_row + 1 < self.grid.rows() {
                self.grid.cursor_row += 1;
            } else {
                self.grid.scroll_up(1);
            }
        }
    }

    fn execute(&mut self, byte: u8) {
        match byte {
            // Newline (LF)
            0x0a => {
                self.check_line_patterns();
                self.line_buf.clear();

                if self.grid.cursor_row + 1 < self.grid.rows() {
                    self.grid.cursor_row += 1;
                } else {
                    self.grid.scroll_up(1);
                }
            }
            // Carriage return (CR)
            0x0d => {
                self.grid.cursor_col = 0;
            }
            // Backspace
            0x08 => {
                if self.grid.cursor_col > 0 {
                    self.grid.cursor_col -= 1;
                }
                self.line_buf.pop();
            }
            // Tab
            0x09 => {
                let next_tab = ((self.grid.cursor_col / 8) + 1) * 8;
                self.grid.cursor_col = next_tab.min(self.grid.cols() - 1);
            }
            // Bell
            0x07 => {
                trace!("BEL");
            }
            _ => {}
        }
    }

    fn osc_dispatch(&mut self, params: &[&[u8]], _bell_terminated: bool) {
        if let Some(data) = self.osc_interceptor.parse_osc(params) {
            self.events.push(ParseEvent::OscData(data));
        }
    }

    fn csi_dispatch(&mut self, params: &vte::Params, _intermediates: &[u8], _ignore: bool, action: char) {
        // Extract first two params with defaults
        let param = |idx: usize, default: u16| -> u16 {
            params.iter().nth(idx)
                .and_then(|p| p.first().copied())
                .and_then(|v| if v == 0 { None } else { Some(v) })
                .unwrap_or(default)
        };

        match action {
            // CUU — Cursor Up
            'A' => {
                let n = param(0, 1);
                self.grid.cursor_row = self.grid.cursor_row.saturating_sub(n);
            }
            // CUD — Cursor Down
            'B' => {
                let n = param(0, 1);
                self.grid.cursor_row = (self.grid.cursor_row + n).min(self.grid.rows() - 1);
            }
            // CUF — Cursor Forward
            'C' => {
                let n = param(0, 1);
                self.grid.cursor_col = (self.grid.cursor_col + n).min(self.grid.cols() - 1);
            }
            // CUB — Cursor Back
            'D' => {
                let n = param(0, 1);
                self.grid.cursor_col = self.grid.cursor_col.saturating_sub(n);
            }
            // CUP — Cursor Position (row;col, 1-indexed)
            'H' | 'f' => {
                let row = param(0, 1).saturating_sub(1);
                let col = param(1, 1).saturating_sub(1);
                self.grid.cursor_row = row.min(self.grid.rows() - 1);
                self.grid.cursor_col = col.min(self.grid.cols() - 1);
            }
            // ED — Erase in Display
            'J' => {
                let mode = param(0, 0);
                match mode {
                    0 => {
                        // Clear from cursor to end of screen
                        let col = self.grid.cursor_col;
                        let row = self.grid.cursor_row;
                        for c in col..self.grid.cols() {
                            self.grid.set(c, row, Cell::default());
                        }
                        for r in (row + 1)..self.grid.rows() {
                            for c in 0..self.grid.cols() {
                                self.grid.set(c, r, Cell::default());
                            }
                        }
                    }
                    2 | 3 => {
                        self.grid.clear();
                    }
                    _ => {}
                }
            }
            // EL — Erase in Line
            'K' => {
                let mode = param(0, 0);
                let row = self.grid.cursor_row;
                match mode {
                    0 => {
                        for c in self.grid.cursor_col..self.grid.cols() {
                            self.grid.set(c, row, Cell::default());
                        }
                    }
                    1 => {
                        for c in 0..=self.grid.cursor_col {
                            self.grid.set(c, row, Cell::default());
                        }
                    }
                    2 => {
                        for c in 0..self.grid.cols() {
                            self.grid.set(c, row, Cell::default());
                        }
                    }
                    _ => {}
                }
            }
            // SGR — Select Graphic Rendition
            'm' => {
                self.apply_sgr(params);
            }
            _ => {
                trace!("Unhandled CSI: {}", action);
            }
        }
    }

    fn hook(&mut self, _params: &vte::Params, _intermediates: &[u8], _ignore: bool, _action: char) {}
    fn put(&mut self, _byte: u8) {}
    fn unhook(&mut self) {}
    fn esc_dispatch(&mut self, _intermediates: &[u8], _ignore: bool, _byte: u8) {}
}

impl VteHandler {
    fn apply_sgr(&mut self, params: &vte::Params) {
        let mut iter = params.iter();

        // If no params, reset
        if params.len() == 0 {
            self.fg = Rgb::WHITE;
            self.bg = Rgb::BLACK;
            self.flags = CellFlags::empty();
            return;
        }

        while let Some(param) = iter.next() {
            let code = param.first().copied().unwrap_or(0);
            match code {
                0 => {
                    self.fg = Rgb::WHITE;
                    self.bg = Rgb::BLACK;
                    self.flags = CellFlags::empty();
                }
                1 => self.flags |= CellFlags::BOLD,
                2 => self.flags |= CellFlags::DIM,
                3 => self.flags |= CellFlags::ITALIC,
                4 => self.flags |= CellFlags::UNDERLINE,
                7 => self.flags |= CellFlags::INVERSE,
                9 => self.flags |= CellFlags::STRIKETHROUGH,
                22 => self.flags -= CellFlags::BOLD | CellFlags::DIM,
                23 => self.flags -= CellFlags::ITALIC,
                24 => self.flags -= CellFlags::UNDERLINE,
                27 => self.flags -= CellFlags::INVERSE,
                29 => self.flags -= CellFlags::STRIKETHROUGH,

                // Standard foreground colors (30-37)
                30 => self.fg = Rgb::new(21, 22, 30),   // black
                31 => self.fg = Rgb::new(247, 118, 142), // red
                32 => self.fg = Rgb::new(158, 206, 106), // green
                33 => self.fg = Rgb::new(224, 175, 104), // yellow
                34 => self.fg = Rgb::new(122, 162, 247), // blue
                35 => self.fg = Rgb::new(187, 154, 247), // magenta
                36 => self.fg = Rgb::new(125, 207, 255), // cyan
                37 => self.fg = Rgb::new(169, 177, 214), // white
                39 => self.fg = Rgb::WHITE, // default

                // Standard background colors (40-47)
                40 => self.bg = Rgb::new(21, 22, 30),
                41 => self.bg = Rgb::new(247, 118, 142),
                42 => self.bg = Rgb::new(158, 206, 106),
                43 => self.bg = Rgb::new(224, 175, 104),
                44 => self.bg = Rgb::new(122, 162, 247),
                45 => self.bg = Rgb::new(187, 154, 247),
                46 => self.bg = Rgb::new(125, 207, 255),
                47 => self.bg = Rgb::new(169, 177, 214),
                49 => self.bg = Rgb::BLACK, // default

                // 256-color and truecolor are handled in extended SGR
                // 38;2;r;g;b — foreground truecolor
                38 => {
                    if let Some(mode) = iter.next() {
                        if mode.first() == Some(&2) {
                            let r = iter.next().and_then(|p| p.first().copied()).unwrap_or(0) as u8;
                            let g = iter.next().and_then(|p| p.first().copied()).unwrap_or(0) as u8;
                            let b = iter.next().and_then(|p| p.first().copied()).unwrap_or(0) as u8;
                            self.fg = Rgb::new(r, g, b);
                        }
                    }
                }
                // 48;2;r;g;b — background truecolor
                48 => {
                    if let Some(mode) = iter.next() {
                        if mode.first() == Some(&2) {
                            let r = iter.next().and_then(|p| p.first().copied()).unwrap_or(0) as u8;
                            let g = iter.next().and_then(|p| p.first().copied()).unwrap_or(0) as u8;
                            let b = iter.next().and_then(|p| p.first().copied()).unwrap_or(0) as u8;
                            self.bg = Rgb::new(r, g, b);
                        }
                    }
                }
                _ => {}
            }
        }
    }
}
```

- [ ] **Step 4: Write PtyManager**

Create `crates/cmux-pty/src/manager.rs`:

```rust
use cmux_core::ids::{PtyId, IdGenerator};
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use tracing::{info, error};

pub struct PtyInstance {
    pub id: PtyId,
    pub master: Box<dyn MasterPty + Send>,
    pub reader: Box<dyn Read + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child_pid: Option<u32>,
    pub cwd: PathBuf,
}

pub struct PtyManager {
    ptys: HashMap<PtyId, PtyInstance>,
    id_gen: IdGenerator,
}

impl PtyManager {
    pub fn new(id_gen: IdGenerator) -> Self {
        Self {
            ptys: HashMap::new(),
            id_gen,
        }
    }

    /// Spawn a new PTY running the given shell.
    pub fn spawn(
        &mut self,
        shell: &str,
        cols: u16,
        rows: u16,
        cwd: PathBuf,
    ) -> Result<PtyId, String> {
        let pty_system = native_pty_system();
        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(size)
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let mut cmd = CommandBuilder::new(shell);
        cmd.cwd(&cwd);

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let child_pid = child.process_id();

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take writer: {}", e))?;

        let pty_id = self.id_gen.next_pty();

        info!(?pty_id, ?child_pid, ?cwd, "Spawned PTY");

        self.ptys.insert(
            pty_id,
            PtyInstance {
                id: pty_id,
                master: pair.master,
                reader,
                writer,
                child_pid,
                cwd,
            },
        );

        Ok(pty_id)
    }

    /// Resize a PTY.
    pub fn resize(&mut self, pty_id: &PtyId, cols: u16, rows: u16) -> Result<(), String> {
        let pty = self
            .ptys
            .get_mut(pty_id)
            .ok_or_else(|| format!("PTY {} not found", pty_id))?;

        pty.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))
    }

    /// Write input to a PTY.
    pub fn write_input(&mut self, pty_id: &PtyId, data: &[u8]) -> Result<(), String> {
        let pty = self
            .ptys
            .get_mut(pty_id)
            .ok_or_else(|| format!("PTY {} not found", pty_id))?;

        pty.writer
            .write_all(data)
            .map_err(|e| format!("Failed to write to PTY: {}", e))
    }

    /// Get a mutable reference to a PTY.
    pub fn get_mut(&mut self, pty_id: &PtyId) -> Option<&mut PtyInstance> {
        self.ptys.get_mut(pty_id)
    }

    /// Kill a PTY.
    pub fn kill(&mut self, pty_id: &PtyId) -> Option<PtyInstance> {
        let pty = self.ptys.remove(pty_id);
        if let Some(ref p) = pty {
            info!(?pty_id, "Killed PTY");
        }
        pty
    }

    /// List all active PTY IDs.
    pub fn active_ids(&self) -> Vec<PtyId> {
        self.ptys.keys().copied().collect()
    }

    pub fn len(&self) -> usize {
        self.ptys.len()
    }

    pub fn is_empty(&self) -> bool {
        self.ptys.is_empty()
    }
}
```

- [ ] **Step 5: Update lib.rs**

Update `crates/cmux-pty/src/lib.rs`:

```rust
pub mod manager;
pub mod parser;
pub mod osc;
```

- [ ] **Step 6: Write tests for OscInterceptor and ClaudePatternDetector**

Create `crates/cmux-pty/tests/osc_test.rs`:

```rust
use cmux_pty::osc::{OscInterceptor, OscData, ClaudePatternDetector};
use cmux_core::claude::ClaudeStatus;
use cmux_core::ids::PaneId;

#[test]
fn parse_osc_title() {
    let interceptor = OscInterceptor::new(PaneId::new(1));
    let result = interceptor.parse_osc(&[b"0", b"My Terminal"]);
    assert!(matches!(result, Some(OscData::Title(t)) if t == "My Terminal"));
}

#[test]
fn parse_osc_cwd() {
    let interceptor = OscInterceptor::new(PaneId::new(1));
    let result = interceptor.parse_osc(&[b"7", b"file:///home/user/project"]);
    assert!(matches!(result, Some(OscData::Cwd(p)) if p.to_str() == Some("/home/user/project")));
}

#[test]
fn parse_osc_notification() {
    let interceptor = OscInterceptor::new(PaneId::new(1));
    let result = interceptor.parse_osc(&[b"9", b"Build complete!"]);
    assert!(matches!(result, Some(OscData::Notification(t)) if t == "Build complete!"));
}

#[test]
fn detect_claude_thinking() {
    let status = ClaudePatternDetector::analyze_line("⏺ Thinking...");
    assert_eq!(status, Some(ClaudeStatus::Thinking));
}

#[test]
fn detect_claude_idle() {
    let status = ClaudePatternDetector::analyze_line("claude ›");
    assert_eq!(status, Some(ClaudeStatus::Idle));
}

#[test]
fn detect_claude_error() {
    let status = ClaudePatternDetector::analyze_line("✗ Permission denied");
    assert!(matches!(status, Some(ClaudeStatus::Error { message }) if message == "Permission denied"));
}

#[test]
fn normal_text_returns_none() {
    let status = ClaudePatternDetector::analyze_line("cargo build --release");
    assert_eq!(status, None);
}
```

- [ ] **Step 7: Write VteHandler tests**

Create `crates/cmux-pty/tests/parser_test.rs`:

```rust
use cmux_pty::parser::VteHandler;
use cmux_core::ids::PaneId;
use vte::Parser;

fn parse_str(handler: &mut VteHandler, parser: &mut Parser, input: &str) {
    for byte in input.bytes() {
        parser.advance(handler, byte);
    }
}

#[test]
fn print_characters() {
    let mut handler = VteHandler::new(80, 24, PaneId::new(1));
    let mut parser = Parser::new();
    parse_str(&mut handler, &mut parser, "Hello");

    assert_eq!(handler.grid.get(0, 0).unwrap().c, 'H');
    assert_eq!(handler.grid.get(1, 0).unwrap().c, 'e');
    assert_eq!(handler.grid.get(4, 0).unwrap().c, 'o');
    assert_eq!(handler.grid.cursor_col, 5);
    assert_eq!(handler.grid.cursor_row, 0);
}

#[test]
fn newline_moves_cursor_down() {
    let mut handler = VteHandler::new(80, 24, PaneId::new(1));
    let mut parser = Parser::new();
    parse_str(&mut handler, &mut parser, "Line1\r\nLine2");

    assert_eq!(handler.grid.get(0, 0).unwrap().c, 'L');
    assert_eq!(handler.grid.get(0, 1).unwrap().c, 'L');
    assert_eq!(handler.grid.cursor_row, 1);
}

#[test]
fn cursor_movement_csi() {
    let mut handler = VteHandler::new(80, 24, PaneId::new(1));
    let mut parser = Parser::new();
    // Move cursor to row 5, col 10 (1-indexed: \x1b[5;10H)
    parse_str(&mut handler, &mut parser, "\x1b[5;10H");

    assert_eq!(handler.grid.cursor_row, 4); // 0-indexed
    assert_eq!(handler.grid.cursor_col, 9);
}

#[test]
fn erase_line() {
    let mut handler = VteHandler::new(80, 24, PaneId::new(1));
    let mut parser = Parser::new();
    parse_str(&mut handler, &mut parser, "ABCDEF");
    // Move cursor to col 3, erase from cursor to end of line
    parse_str(&mut handler, &mut parser, "\x1b[1;4H\x1b[K");

    assert_eq!(handler.grid.get(0, 0).unwrap().c, 'A');
    assert_eq!(handler.grid.get(1, 0).unwrap().c, 'B');
    assert_eq!(handler.grid.get(2, 0).unwrap().c, 'C');
    assert!(handler.grid.get(3, 0).unwrap().is_empty());
}

#[test]
fn sgr_bold() {
    let mut handler = VteHandler::new(80, 24, PaneId::new(1));
    let mut parser = Parser::new();
    // ESC[1m = bold, then print, then ESC[0m = reset
    parse_str(&mut handler, &mut parser, "\x1b[1mBold\x1b[0mNormal");

    assert!(handler.grid.get(0, 0).unwrap().flags.contains(cmux_core::CellFlags::BOLD));
    assert!(!handler.grid.get(4, 0).unwrap().flags.contains(cmux_core::CellFlags::BOLD));
}
```

- [ ] **Step 8: Run all tests**

Run: `cargo test --workspace`
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(pty): add PTY manager, VT parser, OSC interceptor with Claude detection"
```

---

## Milestone 2: Communication (Tasks 5-6)

### Task 5: cmux-ipc — Control Socket & Protocol

**Files:**
- Modify: `crates/cmux-ipc/Cargo.toml`
- Create: `crates/cmux-ipc/src/codec.rs`
- Create: `crates/cmux-ipc/src/server.rs`
- Create: `crates/cmux-ipc/src/client.rs`
- Test: `crates/cmux-ipc/tests/roundtrip_test.rs`

- [ ] **Step 1: Write MessagePack codec**

Create `crates/cmux-ipc/src/codec.rs`:

```rust
use cmux_core::protocol::Message;
use serde::{Deserialize, Serialize};

/// Encode a Message to bytes (length-prefixed MessagePack).
/// Format: [4 bytes big-endian length][msgpack payload]
pub fn encode(msg: &Message) -> Result<Vec<u8>, String> {
    let payload = rmp_serde::to_vec(msg).map_err(|e| format!("Encode error: {}", e))?;
    let len = payload.len() as u32;
    let mut buf = Vec::with_capacity(4 + payload.len());
    buf.extend_from_slice(&len.to_be_bytes());
    buf.extend_from_slice(&payload);
    Ok(buf)
}

/// Decode a Message from a length-prefixed byte stream.
/// Returns (message, bytes_consumed) or error.
pub fn decode(buf: &[u8]) -> Result<Option<(Message, usize)>, String> {
    if buf.len() < 4 {
        return Ok(None); // Need more data
    }
    let len = u32::from_be_bytes([buf[0], buf[1], buf[2], buf[3]]) as usize;
    if buf.len() < 4 + len {
        return Ok(None); // Need more data
    }
    let msg: Message =
        rmp_serde::from_slice(&buf[4..4 + len]).map_err(|e| format!("Decode error: {}", e))?;
    Ok(Some((msg, 4 + len)))
}
```

- [ ] **Step 2: Write ControlServer (async, tokio)**

Create `crates/cmux-ipc/src/server.rs`:

```rust
use crate::codec;
use cmux_core::protocol::{Command, Event, Message, Response};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::{broadcast, mpsc};
use tracing::{info, error, warn};
use std::path::{Path, PathBuf};

/// A connected client session.
struct ClientSession {
    stream: UnixStream,
    read_buf: Vec<u8>,
}

/// Control server that listens on a Unix socket (or named pipe on Windows).
pub struct ControlServer {
    socket_path: PathBuf,
}

/// Channel types for daemon communication.
pub type CommandSender = mpsc::Sender<(Command, mpsc::Sender<Response>)>;
pub type CommandReceiver = mpsc::Receiver<(Command, mpsc::Sender<Response>)>;
pub type EventBroadcaster = broadcast::Sender<Event>;

impl ControlServer {
    pub fn new(socket_path: PathBuf) -> Self {
        Self { socket_path }
    }

    /// Start the server. Returns channels for communicating with the daemon.
    pub async fn start(
        &self,
    ) -> Result<(CommandReceiver, EventBroadcaster), String> {
        // Clean up old socket
        let _ = std::fs::remove_file(&self.socket_path);

        let listener = UnixListener::bind(&self.socket_path)
            .map_err(|e| format!("Failed to bind socket: {}", e))?;

        info!(path = ?self.socket_path, "Control server listening");

        let (cmd_tx, cmd_rx) = mpsc::channel::<(Command, mpsc::Sender<Response>)>(64);
        let (event_tx, _) = broadcast::channel::<Event>(256);
        let event_tx_clone = event_tx.clone();

        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((stream, _)) => {
                        info!("Client connected");
                        let cmd_tx = cmd_tx.clone();
                        let mut event_rx = event_tx_clone.subscribe();
                        tokio::spawn(async move {
                            Self::handle_client(stream, cmd_tx, event_rx).await;
                        });
                    }
                    Err(e) => {
                        error!("Accept error: {}", e);
                    }
                }
            }
        });

        Ok((cmd_rx, event_tx))
    }

    async fn handle_client(
        mut stream: UnixStream,
        cmd_tx: mpsc::Sender<(Command, mpsc::Sender<Response>)>,
        mut event_rx: broadcast::Receiver<Event>,
    ) {
        let mut buf = vec![0u8; 8192];
        let mut read_buf = Vec::new();

        loop {
            tokio::select! {
                // Read commands from client
                result = stream.read(&mut buf) => {
                    match result {
                        Ok(0) => {
                            info!("Client disconnected");
                            return;
                        }
                        Ok(n) => {
                            read_buf.extend_from_slice(&buf[..n]);
                            // Try to decode messages
                            while let Ok(Some((msg, consumed))) = codec::decode(&read_buf) {
                                read_buf.drain(..consumed);
                                if let Message::Command(cmd) = msg {
                                    let (resp_tx, mut resp_rx) = mpsc::channel(1);
                                    if cmd_tx.send((cmd, resp_tx)).await.is_err() {
                                        return;
                                    }
                                    if let Some(resp) = resp_rx.recv().await {
                                        let reply = codec::encode(&Message::Response(resp))
                                            .unwrap_or_default();
                                        if stream.write_all(&reply).await.is_err() {
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            warn!("Read error: {}", e);
                            return;
                        }
                    }
                }
                // Forward events to client
                result = event_rx.recv() => {
                    if let Ok(event) = result {
                        let msg = codec::encode(&Message::Event(event)).unwrap_or_default();
                        if stream.write_all(&msg).await.is_err() {
                            return;
                        }
                    }
                }
            }
        }
    }
}
```

Note: On Windows, replace `UnixListener`/`UnixStream` with `tokio::net::windows::named_pipe`. For the initial implementation, we use Unix sockets which work on Windows via WSL or we add a platform abstraction later.

- [ ] **Step 3: Write ControlClient**

Create `crates/cmux-ipc/src/client.rs`:

```rust
use crate::codec;
use cmux_core::protocol::{Command, Event, Message, Response};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::UnixStream;
use std::path::Path;

pub struct ControlClient {
    stream: UnixStream,
    read_buf: Vec<u8>,
}

impl ControlClient {
    pub async fn connect(socket_path: &Path) -> Result<Self, String> {
        let stream = UnixStream::connect(socket_path)
            .await
            .map_err(|e| format!("Failed to connect to daemon: {}", e))?;
        Ok(Self {
            stream,
            read_buf: Vec::new(),
        })
    }

    /// Send a command and wait for the response.
    pub async fn send_command(&mut self, cmd: Command) -> Result<Response, String> {
        let msg = codec::encode(&Message::Command(cmd))?;
        self.stream
            .write_all(&msg)
            .await
            .map_err(|e| format!("Write error: {}", e))?;

        // Read response
        let mut buf = vec![0u8; 4096];
        loop {
            let n = self
                .stream
                .read(&mut buf)
                .await
                .map_err(|e| format!("Read error: {}", e))?;
            if n == 0 {
                return Err("Connection closed".into());
            }
            self.read_buf.extend_from_slice(&buf[..n]);

            if let Some((msg, consumed)) = codec::decode(&self.read_buf)? {
                self.read_buf.drain(..consumed);
                match msg {
                    Message::Response(resp) => return Ok(resp),
                    Message::Event(_) => continue, // Skip events, we want the response
                    _ => continue,
                }
            }
        }
    }

    /// Read the next event from the stream (blocking until one arrives).
    pub async fn next_event(&mut self) -> Result<Event, String> {
        let mut buf = vec![0u8; 4096];
        loop {
            // Check buffer first
            if let Some((msg, consumed)) = codec::decode(&self.read_buf)? {
                self.read_buf.drain(..consumed);
                if let Message::Event(event) = msg {
                    return Ok(event);
                }
                continue;
            }

            let n = self
                .stream
                .read(&mut buf)
                .await
                .map_err(|e| format!("Read error: {}", e))?;
            if n == 0 {
                return Err("Connection closed".into());
            }
            self.read_buf.extend_from_slice(&buf[..n]);
        }
    }
}
```

- [ ] **Step 4: Update lib.rs**

Update `crates/cmux-ipc/src/lib.rs`:

```rust
pub mod codec;
pub mod server;
pub mod client;
```

- [ ] **Step 5: Write codec roundtrip test**

Create `crates/cmux-ipc/tests/roundtrip_test.rs`:

```rust
use cmux_core::protocol::*;
use cmux_core::layout::Axis;
use cmux_core::ids::PaneId;
use cmux_ipc::codec;
use std::path::PathBuf;

#[test]
fn encode_decode_command() {
    let cmd = Command::NewWorkspace {
        name: "test".into(),
        cwd: PathBuf::from("/tmp"),
    };
    let msg = Message::Command(cmd);
    let bytes = codec::encode(&msg).unwrap();
    let (decoded, consumed) = codec::decode(&bytes).unwrap().unwrap();
    assert_eq!(consumed, bytes.len());
    assert!(matches!(decoded, Message::Command(Command::NewWorkspace { name, .. }) if name == "test"));
}

#[test]
fn encode_decode_response() {
    let resp = Response::PaneCreated {
        pane_id: PaneId::new(42),
        pty_id: cmux_core::ids::PtyId::new(7),
    };
    let msg = Message::Response(resp);
    let bytes = codec::encode(&msg).unwrap();
    let (decoded, _) = codec::decode(&bytes).unwrap().unwrap();
    assert!(matches!(decoded, Message::Response(Response::PaneCreated { pane_id, .. }) if pane_id == PaneId::new(42)));
}

#[test]
fn partial_decode_returns_none() {
    let msg = Message::Command(Command::ListSessions);
    let bytes = codec::encode(&msg).unwrap();
    // Only send first 3 bytes (less than length header)
    assert!(codec::decode(&bytes[..3]).unwrap().is_none());
    // Send header but not full payload
    if bytes.len() > 5 {
        assert!(codec::decode(&bytes[..5]).unwrap().is_none());
    }
}

#[test]
fn multiple_messages_in_stream() {
    let msg1 = Message::Command(Command::SplitPane {
        pane_id: PaneId::new(1),
        axis: Axis::Vertical,
    });
    let msg2 = Message::Response(Response::Ok);

    let mut stream = codec::encode(&msg1).unwrap();
    stream.extend(codec::encode(&msg2).unwrap());

    let (decoded1, consumed1) = codec::decode(&stream).unwrap().unwrap();
    assert!(matches!(decoded1, Message::Command(Command::SplitPane { .. })));

    let (decoded2, _consumed2) = codec::decode(&stream[consumed1..]).unwrap().unwrap();
    assert!(matches!(decoded2, Message::Response(Response::Ok)));
}
```

- [ ] **Step 6: Run all tests**

Run: `cargo test --workspace`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ipc): add MessagePack codec, control server, and client"
```

---

### Task 6: cmux-daemon — Basic Daemon

**Files:**
- Modify: `crates/cmux-daemon/src/main.rs`
- Create: `crates/cmux-daemon/src/app.rs`
- Create: `crates/cmux-daemon/src/registry.rs`
- Create: `crates/cmux-daemon/src/persistence.rs`

This task assembles the foundation crates into a working daemon that can:
1. Start as a background process
2. Accept connections on a control socket
3. Handle commands: create workspace, new tab, split pane, spawn PTY
4. Read PTY output, parse VT sequences, write to CellGrid

- [ ] **Step 1: Write SessionRegistry**

Create `crates/cmux-daemon/src/registry.rs`:

```rust
use cmux_core::ids::*;
use cmux_core::layout::*;
use std::collections::HashMap;
use std::path::PathBuf;

/// Manages the full session state: workspaces, tabs, panes.
pub struct SessionRegistry {
    pub state: SessionState,
    pub panes: HashMap<PaneId, Pane>,
    id_gen: IdGenerator,
}

impl SessionRegistry {
    pub fn new() -> Self {
        let id_gen = IdGenerator::new();
        let ws_id = id_gen.next_workspace();
        let tab_id = id_gen.next_tab();
        let pane_id = id_gen.next_pane();

        let pane = Pane {
            id: pane_id,
            pty_id: PtyId::new(0), // Will be set when PTY is spawned
            cwd: PathBuf::from("."),
            title: String::new(),
            claude_status: None,
            last_command: None,
        };

        let tab = Tab {
            id: tab_id,
            name: "main".into(),
            root: SplitNode::leaf(pane_id),
            focused_pane: pane_id,
        };

        let workspace = Workspace {
            id: ws_id,
            name: "default".into(),
            cwd: PathBuf::from("."),
            tabs: vec![tab],
            active_tab: tab_id,
        };

        let mut panes = HashMap::new();
        panes.insert(pane_id, pane);

        Self {
            state: SessionState {
                workspaces: vec![workspace],
                active_workspace: ws_id,
            },
            panes,
            id_gen,
        }
    }

    pub fn id_gen(&self) -> &IdGenerator {
        &self.id_gen
    }

    /// Create a new workspace. Returns (WorkspaceId, initial PaneId).
    pub fn new_workspace(&mut self, name: String, cwd: PathBuf) -> (WorkspaceId, PaneId) {
        let ws_id = self.id_gen.next_workspace();
        let tab_id = self.id_gen.next_tab();
        let pane_id = self.id_gen.next_pane();

        let pane = Pane {
            id: pane_id,
            pty_id: PtyId::new(0),
            cwd: cwd.clone(),
            title: String::new(),
            claude_status: None,
            last_command: None,
        };

        let tab = Tab {
            id: tab_id,
            name: "main".into(),
            root: SplitNode::leaf(pane_id),
            focused_pane: pane_id,
        };

        let workspace = Workspace {
            id: ws_id,
            name,
            cwd,
            tabs: vec![tab],
            active_tab: tab_id,
        };

        self.panes.insert(pane_id, pane);
        self.state.workspaces.push(workspace);

        (ws_id, pane_id)
    }

    /// Create a new tab in a workspace. Returns (TabId, PaneId).
    pub fn new_tab(&mut self, workspace_id: WorkspaceId, name: String) -> Option<(TabId, PaneId)> {
        let ws = self.state.workspaces.iter_mut().find(|w| w.id == workspace_id)?;
        let tab_id = self.id_gen.next_tab();
        let pane_id = self.id_gen.next_pane();

        let pane = Pane {
            id: pane_id,
            pty_id: PtyId::new(0),
            cwd: ws.cwd.clone(),
            title: String::new(),
            claude_status: None,
            last_command: None,
        };

        let tab = Tab {
            id: tab_id,
            name,
            root: SplitNode::leaf(pane_id),
            focused_pane: pane_id,
        };

        self.panes.insert(pane_id, pane);
        ws.tabs.push(tab);

        Some((tab_id, pane_id))
    }

    /// Split a pane. Returns the new PaneId.
    pub fn split_pane(&mut self, pane_id: PaneId, axis: Axis) -> Option<PaneId> {
        let new_pane_id = self.id_gen.next_pane();

        // Find the tab containing this pane and split
        for ws in &mut self.state.workspaces {
            for tab in &mut ws.tabs {
                if tab.root.split_pane(pane_id, axis, new_pane_id) {
                    let pane = Pane {
                        id: new_pane_id,
                        pty_id: PtyId::new(0),
                        cwd: self.panes.get(&pane_id).map(|p| p.cwd.clone()).unwrap_or_default(),
                        title: String::new(),
                        claude_status: None,
                        last_command: None,
                    };
                    self.panes.insert(new_pane_id, pane);
                    return Some(new_pane_id);
                }
            }
        }
        None
    }

    /// Close a pane. Returns true if found.
    pub fn close_pane(&mut self, pane_id: PaneId) -> bool {
        for ws in &mut self.state.workspaces {
            for tab in &mut ws.tabs {
                if tab.root.remove_pane(pane_id) {
                    self.panes.remove(&pane_id);
                    return true;
                }
            }
        }
        false
    }

    /// Set the PtyId for a pane.
    pub fn set_pane_pty(&mut self, pane_id: PaneId, pty_id: PtyId) {
        if let Some(pane) = self.panes.get_mut(&pane_id) {
            pane.pty_id = pty_id;
        }
    }

    /// Get a pane's PtyId.
    pub fn pane_pty(&self, pane_id: &PaneId) -> Option<PtyId> {
        self.panes.get(pane_id).map(|p| p.pty_id)
    }
}
```

- [ ] **Step 2: Write StatePersistence**

Create `crates/cmux-daemon/src/persistence.rs`:

```rust
use cmux_core::layout::SessionState;
use std::path::{Path, PathBuf};
use tracing::{info, error};

pub struct StatePersistence {
    base_dir: PathBuf,
}

impl StatePersistence {
    pub fn new(base_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&base_dir).ok();
        std::fs::create_dir_all(base_dir.join("sessions")).ok();
        std::fs::create_dir_all(base_dir.join("sessions/backups")).ok();
        std::fs::create_dir_all(base_dir.join("scrollback")).ok();
        std::fs::create_dir_all(base_dir.join("snapshots")).ok();
        std::fs::create_dir_all(base_dir.join("logs")).ok();
        Self { base_dir }
    }

    pub fn session_path(&self) -> PathBuf {
        self.base_dir.join("sessions/current.json")
    }

    /// Save session state to disk.
    pub fn save_session(&self, state: &SessionState) -> Result<(), String> {
        let json = serde_json::to_string_pretty(state)
            .map_err(|e| format!("Serialize error: {}", e))?;
        std::fs::write(self.session_path(), &json)
            .map_err(|e| format!("Write error: {}", e))?;
        info!("Session saved");
        Ok(())
    }

    /// Load session state from disk.
    pub fn load_session(&self) -> Option<SessionState> {
        let path = self.session_path();
        if !path.exists() {
            return None;
        }
        let json = std::fs::read_to_string(&path).ok()?;
        serde_json::from_str(&json).ok()
    }

    /// Write a lock file with the current PID.
    pub fn write_lock(&self) -> Result<(), String> {
        let lock_path = self.base_dir.join("daemon.lock");
        let pid = std::process::id();
        std::fs::write(&lock_path, pid.to_string())
            .map_err(|e| format!("Failed to write lock: {}", e))
    }

    /// Remove the lock file.
    pub fn remove_lock(&self) {
        let lock_path = self.base_dir.join("daemon.lock");
        std::fs::remove_file(&lock_path).ok();
    }

    /// Check if another daemon is running (lock file exists with alive PID).
    pub fn is_daemon_running(&self) -> Option<u32> {
        let lock_path = self.base_dir.join("daemon.lock");
        let pid_str = std::fs::read_to_string(&lock_path).ok()?;
        let pid: u32 = pid_str.trim().parse().ok()?;
        // Check if process is alive (platform-specific)
        #[cfg(unix)]
        {
            use std::process::Command;
            let output = Command::new("kill").args(["-0", &pid.to_string()]).output().ok()?;
            if output.status.success() { Some(pid) } else { None }
        }
        #[cfg(windows)]
        {
            // On Windows, use tasklist
            use std::process::Command;
            let output = Command::new("tasklist")
                .args(["/FI", &format!("PID eq {}", pid)])
                .output().ok()?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains(&pid.to_string()) { Some(pid) } else { None }
        }
    }

    pub fn socket_path(&self) -> PathBuf {
        self.base_dir.join("daemon.sock")
    }
}
```

- [ ] **Step 3: Write DaemonApp (main event loop)**

Create `crates/cmux-daemon/src/app.rs`:

```rust
use crate::persistence::StatePersistence;
use crate::registry::SessionRegistry;
use cmux_core::ids::*;
use cmux_core::protocol::*;
use cmux_ipc::server::{ControlServer, CommandReceiver, EventBroadcaster};
use cmux_pty::manager::PtyManager;
use cmux_pty::parser::VteHandler;
use cmux_shm::pool::ShmPool;
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::sync::mpsc;
use tracing::{info, error};
use vte::Parser;

pub struct DaemonApp {
    registry: SessionRegistry,
    pty_manager: PtyManager,
    shm_pool: ShmPool,
    persistence: StatePersistence,
    parsers: HashMap<PtyId, (VteHandler, Parser)>,
    shell: String,
    default_cols: u16,
    default_rows: u16,
}

impl DaemonApp {
    pub fn new(base_dir: PathBuf, shell: String) -> Self {
        let registry = SessionRegistry::new();
        let id_gen = IdGenerator::new();
        Self {
            registry,
            pty_manager: PtyManager::new(id_gen),
            shm_pool: ShmPool::new(),
            persistence: StatePersistence::new(base_dir),
            parsers: HashMap::new(),
            shell,
            default_cols: 80,
            default_rows: 24,
        }
    }

    pub async fn run(&mut self) -> Result<(), String> {
        // Write lock file
        self.persistence.write_lock()?;

        // Start control server
        let server = ControlServer::new(self.persistence.socket_path());
        let (mut cmd_rx, event_tx) = server.start().await?;

        // Spawn initial PTY for the default pane
        let initial_pane_id = self.registry.state.workspaces[0].tabs[0]
            .root
            .pane_ids()[0];
        self.spawn_pty_for_pane(initial_pane_id)?;

        info!("Daemon ready");

        // Main loop: handle commands
        while let Some((cmd, resp_tx)) = cmd_rx.recv().await {
            let response = self.handle_command(cmd, &event_tx);
            resp_tx.send(response).await.ok();
        }

        // Cleanup
        self.persistence.remove_lock();
        Ok(())
    }

    fn handle_command(&mut self, cmd: Command, event_tx: &EventBroadcaster) -> Response {
        match cmd {
            Command::NewWorkspace { name, cwd } => {
                let (ws_id, pane_id) = self.registry.new_workspace(name, cwd);
                if let Err(e) = self.spawn_pty_for_pane(pane_id) {
                    return Response::Error { message: e };
                }
                Response::WorkspaceCreated { workspace_id: ws_id }
            }
            Command::NewTab { workspace_id, name } => {
                match self.registry.new_tab(workspace_id, name) {
                    Some((tab_id, pane_id)) => {
                        if let Err(e) = self.spawn_pty_for_pane(pane_id) {
                            return Response::Error { message: e };
                        }
                        Response::TabCreated { tab_id }
                    }
                    None => Response::Error {
                        message: "Workspace not found".into(),
                    },
                }
            }
            Command::SplitPane { pane_id, axis } => {
                match self.registry.split_pane(pane_id, axis) {
                    Some(new_pane_id) => {
                        if let Err(e) = self.spawn_pty_for_pane(new_pane_id) {
                            return Response::Error { message: e };
                        }
                        let pty_id = self.registry.pane_pty(&new_pane_id).unwrap();
                        Response::PaneCreated {
                            pane_id: new_pane_id,
                            pty_id,
                        }
                    }
                    None => Response::Error {
                        message: "Pane not found".into(),
                    },
                }
            }
            Command::ClosePane { pane_id } => {
                if let Some(pty_id) = self.registry.pane_pty(&pane_id) {
                    self.pty_manager.kill(&pty_id);
                    self.shm_pool.remove(&pty_id);
                    self.parsers.remove(&pty_id);
                }
                self.registry.close_pane(pane_id);
                event_tx.send(Event::PaneClosed { pane_id }).ok();
                Response::Ok
            }
            Command::WriteInput { pane_id, data } => {
                if let Some(pty_id) = self.registry.pane_pty(&pane_id) {
                    match self.pty_manager.write_input(&pty_id, &data) {
                        Ok(()) => Response::Ok,
                        Err(e) => Response::Error { message: e },
                    }
                } else {
                    Response::Error {
                        message: "Pane not found".into(),
                    }
                }
            }
            Command::ResizePty { pane_id, cols, rows } => {
                if let Some(pty_id) = self.registry.pane_pty(&pane_id) {
                    match self.pty_manager.resize(&pty_id, cols, rows) {
                        Ok(()) => Response::Ok,
                        Err(e) => Response::Error { message: e },
                    }
                } else {
                    Response::Error {
                        message: "Pane not found".into(),
                    }
                }
            }
            Command::ListSessions => {
                Response::SessionState(self.registry.state.clone())
            }
            Command::SaveSession => {
                match self.persistence.save_session(&self.registry.state) {
                    Ok(()) => Response::Ok,
                    Err(e) => Response::Error { message: e },
                }
            }
            Command::Shutdown { save } => {
                if save {
                    self.persistence.save_session(&self.registry.state).ok();
                }
                self.persistence.remove_lock();
                std::process::exit(0);
            }
            _ => Response::Ok,
        }
    }

    fn spawn_pty_for_pane(&mut self, pane_id: PaneId) -> Result<(), String> {
        let cwd = self
            .registry
            .panes
            .get(&pane_id)
            .map(|p| p.cwd.clone())
            .unwrap_or_else(|| PathBuf::from("."));

        let pty_id = self
            .pty_manager
            .spawn(&self.shell, self.default_cols, self.default_rows, cwd)?;

        self.registry.set_pane_pty(pane_id, pty_id);
        self.shm_pool
            .create(pty_id, self.default_cols, self.default_rows);

        let handler = VteHandler::new(self.default_cols, self.default_rows, pane_id);
        let parser = Parser::new();
        self.parsers.insert(pty_id, (handler, parser));

        Ok(())
    }
}
```

- [ ] **Step 4: Write daemon main.rs**

Update `crates/cmux-daemon/src/main.rs`:

```rust
mod app;
mod persistence;
mod registry;

use app::DaemonApp;
use clap::Parser;
use std::path::PathBuf;
use tracing_subscriber::EnvFilter;

#[derive(Parser)]
#[command(name = "cmux-daemon", about = "cmux terminal multiplexer daemon")]
struct Args {
    /// Path to cmux config directory
    #[arg(long, default_value = "~/.cmux")]
    config_dir: String,

    /// Shell to launch in new panes
    #[arg(long)]
    shell: Option<String>,

    /// Log level
    #[arg(long, default_value = "info")]
    log_level: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Setup logging
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new(&args.log_level)),
        )
        .init();

    // Resolve config dir
    let config_dir = shellexpand::tilde(&args.config_dir).to_string();
    let config_dir = PathBuf::from(config_dir);

    // Detect shell
    let shell = args.shell.unwrap_or_else(|| {
        std::env::var("SHELL")
            .or_else(|_| std::env::var("COMSPEC"))
            .unwrap_or_else(|_| {
                if cfg!(windows) {
                    "pwsh.exe".into()
                } else {
                    "/bin/bash".into()
                }
            })
    });

    let mut app = DaemonApp::new(config_dir, shell);
    app.run().await.map_err(|e| e.into())
}
```

Add `shellexpand` to `crates/cmux-daemon/Cargo.toml`:

```toml
[dependencies]
# ... existing deps ...
shellexpand = "3"
```

- [ ] **Step 5: Verify it compiles**

Run: `cargo build --workspace`
Expected: All crates compile.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(daemon): add daemon app with session registry, persistence, and command handling"
```

---

## Milestone 3: Rendering (Tasks 7-8)

> Tasks 7-8 implement the wgpu GPU renderer and the GUI client with basic terminal display. These are the most complex tasks and will be broken into sub-steps during implementation. The key structures are outlined here.

### Task 7: cmux-gpu — GPU Renderer

**Files:**
- Create: `crates/cmux-gpu/src/renderer.rs`
- Create: `crates/cmux-gpu/src/atlas.rs`
- Create: `crates/cmux-gpu/src/pipeline.rs`
- Create: `crates/cmux-gpu/src/rect.rs`
- Create: `crates/cmux-gpu/shaders/cell.wgsl`
- Create: `crates/cmux-gpu/shaders/rect.wgsl`

This task creates the GPU rendering pipeline. The approach:
1. **GlyphAtlas** — Rasterize font glyphs using `fontdue`, pack into a texture atlas
2. **CellPipeline** — For each visible cell, emit a quad textured with the glyph from the atlas
3. **RectPipeline** — For UI elements (borders, backgrounds, selection) emit colored quads
4. **GpuRenderer** — Orchestrates wgpu device, surface, and render passes

- [ ] **Step 1: Add dependencies**

Update `crates/cmux-gpu/Cargo.toml`:

```toml
[package]
name = "cmux-gpu"
version.workspace = true
edition.workspace = true

[dependencies]
cmux-core = { workspace = true }
wgpu = "24"
fontdue = "0.9"
bytemuck = { version = "1", features = ["derive"] }
tracing = { workspace = true }
```

- [ ] **Step 2: Write GlyphAtlas**

Create `crates/cmux-gpu/src/atlas.rs` — rasterizes glyphs with `fontdue`, packs into a 2D texture atlas. Each glyph gets a UV region in the atlas.

Key structures:
```rust
pub struct GlyphInfo {
    pub uv_min: [f32; 2],
    pub uv_max: [f32; 2],
    pub size: [f32; 2],
    pub offset: [f32; 2],
    pub advance: f32,
}

pub struct GlyphAtlas {
    pub texture: wgpu::Texture,
    pub view: wgpu::TextureView,
    pub sampler: wgpu::Sampler,
    glyphs: HashMap<(char, bool, bool), GlyphInfo>, // (char, bold, italic)
    atlas_size: u32,
}
```

The atlas prerenders ASCII (32-126) + common Unicode at startup, and rasterizes new glyphs on-demand.

- [ ] **Step 3: Write cell.wgsl shader**

Create `crates/cmux-gpu/shaders/cell.wgsl`:

```wgsl
struct CellInstance {
    @location(0) pos: vec2<f32>,      // Screen position (pixels)
    @location(1) size: vec2<f32>,     // Cell size (pixels)
    @location(2) uv_min: vec2<f32>,   // Glyph UV min in atlas
    @location(3) uv_max: vec2<f32>,   // Glyph UV max in atlas
    @location(4) fg_color: vec4<f32>, // Foreground RGBA
    @location(5) bg_color: vec4<f32>, // Background RGBA
};

struct Uniforms {
    screen_size: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var atlas_texture: texture_2d<f32>;
@group(0) @binding(2) var atlas_sampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) fg_color: vec4<f32>,
    @location(2) bg_color: vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32, instance: CellInstance) -> VertexOutput {
    // Generate quad vertices (2 triangles, 6 vertices)
    let quad_pos = array<vec2<f32>, 6>(
        vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
        vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0),
    );

    let p = quad_pos[vi];
    let pixel_pos = instance.pos + p * instance.size;

    // Convert to NDC
    let ndc = vec2(
        pixel_pos.x / uniforms.screen_size.x * 2.0 - 1.0,
        1.0 - pixel_pos.y / uniforms.screen_size.y * 2.0,
    );

    var out: VertexOutput;
    out.position = vec4(ndc, 0.0, 1.0);
    out.uv = mix(instance.uv_min, instance.uv_max, p);
    out.fg_color = instance.fg_color;
    out.bg_color = instance.bg_color;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let glyph_alpha = textureSample(atlas_texture, atlas_sampler, in.uv).r;
    return mix(in.bg_color, in.fg_color, glyph_alpha);
}
```

- [ ] **Step 4: Write CellPipeline**

Create `crates/cmux-gpu/src/pipeline.rs` — manages the wgpu render pipeline, instance buffer, and bind groups for cell rendering.

Key methods:
- `new(device, format, atlas)` — create pipeline
- `prepare(device, queue, cells, cell_size, screen_size)` — upload instance data
- `render(render_pass)` — draw all cells

- [ ] **Step 5: Write rect.wgsl shader and RectPipeline**

Create `crates/cmux-gpu/shaders/rect.wgsl` — simple solid-color quad shader.
Create `crates/cmux-gpu/src/rect.rs` — pipeline for borders, backgrounds, selection highlights.

- [ ] **Step 6: Write GpuRenderer**

Create `crates/cmux-gpu/src/renderer.rs`:

Key structure:
```rust
pub struct GpuRenderer {
    device: wgpu::Device,
    queue: wgpu::Queue,
    surface: wgpu::Surface,
    config: wgpu::SurfaceConfiguration,
    cell_pipeline: CellPipeline,
    rect_pipeline: RectPipeline,
    atlas: GlyphAtlas,
}
```

Key methods:
- `new(window)` — initialize wgpu, create pipelines
- `resize(width, height)` — handle window resize
- `render(frame_data)` — full frame render: clear → rects (backgrounds) → cells (glyphs)

- [ ] **Step 7: Update lib.rs**

```rust
pub mod renderer;
pub mod atlas;
pub mod pipeline;
pub mod rect;
```

- [ ] **Step 8: Verify compilation**

Run: `cargo build --workspace`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(gpu): add wgpu renderer with glyph atlas, cell pipeline, and rect pipeline"
```

---

### Task 8: cmux-gui — Basic Terminal Display

**Files:**
- Modify: `crates/cmux-gui/src/main.rs`
- Create: `crates/cmux-gui/src/app.rs`
- Create: `crates/cmux-gui/src/layout.rs`
- Create: `crates/cmux-gui/src/input.rs`
- Create: `crates/cmux-gui/src/keybinds.rs`
- Create: `crates/cmux-gui/src/theme.rs`

This task creates the GUI client that:
1. Opens a winit window
2. Connects to the daemon via control socket
3. Reads CellGrids from shared memory
4. Renders them via the GPU renderer
5. Handles keyboard input → sends to daemon

- [ ] **Step 1: Write Theme loader**

Create `crates/cmux-gui/src/theme.rs` — loads `theme.toml`, provides colors and font paths.

- [ ] **Step 2: Write KeybindManager**

Create `crates/cmux-gui/src/keybinds.rs` — loads `keybinds.toml`, matches winit key events to actions.

- [ ] **Step 3: Write InputHandler**

Create `crates/cmux-gui/src/input.rs` — receives winit events, checks keybinds, either dispatches as IPC command or forwards as PTY input.

- [ ] **Step 4: Write LayoutEngine**

Create `crates/cmux-gui/src/layout.rs` — takes SessionState from daemon, computes screen Rects for all panes, handles resize.

- [ ] **Step 5: Write GuiApp**

Create `crates/cmux-gui/src/app.rs` — main application struct that coordinates renderer, layout, input, and daemon connection.

- [ ] **Step 6: Write main.rs with winit event loop**

Update `crates/cmux-gui/src/main.rs` — winit application loop, creates window, handles events, calls render.

- [ ] **Step 7: End-to-end test: launch daemon + GUI**

Manual test:
1. `cargo run --bin cmux-daemon`
2. In another terminal: `cargo run --bin cmux-gui`
3. Verify: window opens, terminal renders, typing works

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(gui): add basic terminal display with winit, wgpu rendering, and daemon connection"
```

---

## Milestone 4: Multiplexer Features (Tasks 9-12)

### Task 9: Layout — Splits, Tabs, Workspaces UI

Implement the full layout system with split borders, resizable splits (mouse drag), tab bar rendering in the sidebar, and workspace switching.

- [ ] Steps: Render split borders → mouse hit-testing for resize handles → drag-to-resize → sidebar rendering → tab switching → workspace switching → commit.

### Task 10: Widget System

Implement sidebar (workspace list + tab list with Claude status), status bar (bottom info), notification overlay (popup), and command palette (fuzzy search).

- [ ] Steps: Widget trait → Sidebar widget → StatusBar widget → NotificationOverlay → CommandPalette with fuzzy search → commit.

### Task 11: Input & Keybinds System

Full keybind system with configurable shortcuts, command palette integration, and mouse support.

- [ ] Steps: Load keybinds.toml → match key events → command dispatch → mouse events (focus, resize, scroll) → commit.

### Task 12: Integration Test — Full Multiplexer

End-to-end test with multiple workspaces, tabs, splits, keybind navigation.

- [ ] Steps: Write integration test → manual smoke test → fix bugs → commit.

---

## Milestone 5: Intelligence & Polish (Tasks 13-16)

### Task 13: Persistence & Daemon Lifecycle

Full session persistence with debounced saves, scrollback flush, snapshot on hibernate, auto-start daemon, and all recovery scenarios.

- [ ] Steps: Debounced save timer → scrollback persistence → snapshot on shutdown → daemon auto-start → recovery from crash → commit.

### Task 14: OSC Interceptor & Claude Code Detection

Wire up the 3-level detection (process tree, OSC sequences, output patterns) into the daemon's PTY read loop. Forward ClaudeEvents to subscribed clients.

- [ ] Steps: Process tree polling (sysinfo) → OSC extraction in VteHandler → pattern analysis → ClaudeEvent emission → GUI rendering of status → commit.

### Task 15: Configuration System

TOML config loading for `config.toml`, `keybinds.toml`, and `theme.toml` with defaults, hot-reload support, and theme switching.

- [ ] Steps: Config structs → default config files → load from ~/.cmux/ → hot-reload on file change → commit.

### Task 16: cmux-cli

Full CLI with all 10 commands, JSON output support, and tab completion.

- [ ] Steps: Clap command definitions → connect to daemon → implement each command → JSON output mode → shell completions → commit.

---

## Milestone 6: Final (Task 17)

### Task 17: Polish & Documentation

README, default configs, install script, and final integration testing.

- [ ] Steps: README.md → default config files in config/ → install script → final smoke test → tag v0.1.0 → commit.

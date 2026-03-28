# cmux — Terminal Multiplexer IA-Natif

> Application desktop lourde en Rust pur (wgpu) pour le multi-tasking terminal avec intégration native Claude Code.

**Date** : 2026-03-28
**Auteur** : Alexi (brainstorm assisté par Claude)
**Statut** : Design validé — prêt pour implémentation
**Scope** : Phase 1 — Multiplexeur terminal (sans couches IA avancées ni éditeur intégré)

---

## 1. Vision & Objectifs

**Problème** : Les multiplexeurs existants (tmux, Zellij, cmux) ne sont pas conçus pour orchestrer des sessions Claude Code en parallèle. L'utilisateur doit jongler entre plusieurs terminaux sans visibilité sur l'état des agents IA.

**Solution** : Un multiplexeur terminal GPU-accelerated en Rust avec :
- Détection native de Claude Code (statut, notifications, events)
- Architecture client-serveur pour persistance totale des sessions
- UI custom wgpu (pas de webview, pas de toolkit) pour performance maximale
- CLI scriptable pour l'automatisation

**Inspirations** : cmux (manaflow-ai), Zed (GPUI), Alacritty, WezTerm, tmux.

**Phases prévues** :
1. **Phase 1 (ce spec)** : Multiplexeur terminal fonctionnel avec détection Claude Code
2. **Phase 2 (futur)** : Intégration Mugiwara (agent spawner, multi-agent dashboard, context sharing)
3. **Phase 3 (futur)** : IDE hybride (éditeur de code, file explorer, LSP)

---

## 2. Architecture globale

### 2.1 Architecture Client-Serveur

Trois binaires dans un Cargo workspace :

```
cmux-daemon (background, toujours vivant)
├── PTY Manager (portable-pty, vte parsing)
├── Session Registry (workspaces, tabs, splits)
├── Ring Buffer Pool (shared memory, un par PTY)
├── OSC Interceptor (détection Claude Code)
├── Control Server (named pipe / unix socket)
└── State Persistence (session.json, scrollback, snapshots)

cmux-gui (client graphique, se connecte au daemon)
├── GPU Renderer (wgpu, glyph atlas, cell grid shader)
├── Layout Engine (SplitTree → rectangles écran)
├── Input Handler (winit events → keybinds)
├── Widget System (tabs, statusbar, command palette, notifications)
└── Theme Engine (fonts, couleurs, styles)

cmux (CLI thin client)
└── Control Socket Client (commandes scriptables)
```

### 2.2 Cargo Workspace — 8 crates

| Crate | Type | Responsabilité |
|-------|------|---------------|
| `cmux-core` | lib | Types partagés : CellGrid, SplitTree, PaneId, WorkspaceId, Protocol IPC |
| `cmux-pty` | lib | PTY manager (portable-pty), vte parsing, OSC interceptor |
| `cmux-shm` | lib | Shared memory, ring buffers, seqlock, dirty flags |
| `cmux-ipc` | lib | Control socket (named pipe Windows / unix socket), MessagePack protocol |
| `cmux-daemon` | bin | Orchestration daemon — assemble pty + shm + ipc + persistence |
| `cmux-gpu` | lib | wgpu renderer, glyph atlas, cell grid shaders, text rendering |
| `cmux-gui` | bin | Client graphique — winit window, layout engine, widgets, input |
| `cmux-cli` | bin | CLI thin client (clap) |

### 2.3 Dépendances Rust clés

| Crate externe | Usage |
|---------------|-------|
| `portable-pty` | Spawn et gestion des pseudo-terminaux (cross-platform) |
| `vte` | Parser de séquences VT100/ANSI |
| `wgpu` | Rendering GPU (Vulkan/DX12/Metal) |
| `winit` | Fenêtre et événements OS |
| `shared_memory` | Mémoire partagée inter-process |
| `rmp-serde` | Sérialisation MessagePack |
| `clap` | Parsing CLI |
| `sysinfo` | Inspection process tree (détection Claude Code) |
| `toml` | Parsing configuration |
| `serde` / `serde_json` | Sérialisation session state |
| `tracing` | Logging structuré |
| `tokio` | Async runtime (daemon event loop) |

---

## 3. Flux de données terminal

### 3.1 Input Flow (clavier → process)

```
winit KeyEvent → input-handler → keybind?
  ├─ OUI → Action interne → IPC command → daemon
  └─ NON → UTF-8 bytes → PTY write (via shm) [< 0.5ms]
```

### 3.2 Output Flow (process → écran)

```
PTY read (raw bytes) → vte parser → séquence?
  ├─ Caractères → CellGrid update → Ring Buffer (shm) → GPU read → écran
  ├─ CSI/ESC    → cursor/color/scroll → CellGrid update → même chemin
  └─ OSC ✨     → OSC Interceptor → Event Bus → GUI notifications
```

### 3.3 Shared Memory — Ring Buffer par PTY

Chaque PTY dispose d'une région de mémoire partagée :

```rust
struct ShmRegion {
    header: ShmHeader {
        write_seq: AtomicU64,   // Incrémenté par le daemon à chaque write
        read_seq: AtomicU64,    // Incrémenté par le GUI après lecture
        cols: u16,
        rows: u16,
    },
    cells: [Cell; cols × rows × 2],     // Double buffer
    scrollback: RingBuffer<[Cell; cols]>, // N lignes d'historique
    dirty_flags: AtomicBitset,           // Quelles lignes ont changé
}

struct Cell {
    char: u32,    // Unicode codepoint
    fg: Rgb,      // Foreground color
    bg: Rgb,      // Background color
    flags: u8,    // bold, italic, underline, inverse, strikethrough
}
```

**Synchronisation** : Seqlock pattern — pas de mutex.
- Le daemon écrit les cells, incrémente `write_seq`, set `dirty_flags`
- Le GUI compare `read_seq` vs `write_seq` → si différent, lit les lignes dirty → render
- Si mismatch détecté pendant la lecture (writer a re-écrit), le GUI retry

### 3.4 Objectifs de latence

| Segment | Cible | Technique |
|---------|-------|-----------|
| Keystroke → PTY write | < 0.5ms | Direct shm write, pas d'IPC |
| PTY output → CellGrid | < 1ms | vte parse in-place, batch updates |
| CellGrid → GPU frame | < 2ms | Dirty-line only upload, instanced rendering |
| **Total keypress-to-pixel** | **< 5ms** | vs ~15ms Alacritty, ~8ms WezTerm |
| Frame rate | vsync (60-144fps) | wgpu present mode: Fifo |

---

## 4. Layout Engine & Workspaces

### 4.1 Modèle de données — 3 niveaux

```rust
struct SessionState {
    workspaces: Vec<Workspace>,
    active_workspace: WorkspaceId,
}

struct Workspace {
    id: WorkspaceId,
    name: String,           // "mugiwara-agents", "cmux-dev"
    cwd: PathBuf,           // Répertoire racine
    tabs: Vec<Tab>,
    active_tab: TabId,
    metadata: WorkspaceMeta, // git branch, project type
}

struct Tab {
    id: TabId,
    name: String,
    root: SplitNode,        // Arbre de splits
    focused_pane: PaneId,
}

enum SplitNode {
    Leaf { pane: PaneId },
    Split {
        axis: Axis,              // Horizontal | Vertical
        ratio: f32,              // 0.0..1.0
        left: Box<SplitNode>,
        right: Box<SplitNode>,
    },
}

struct Pane {
    id: PaneId,
    pty_id: PtyId,
    cwd: PathBuf,
    title: String,                        // Set by OSC title sequence
    claude_status: Option<ClaudeStatus>,  // Idle | Thinking | ToolUse | Error
    notifications: Vec<Notification>,
    last_command: Option<String>,
}
```

### 4.2 Interface visuelle

```
┌─────────────────────────────────────────────────────────┐
│ cmux — mugiwara-agents                                  │
├──────────┬──────────────────────┬───────────────────────┤
│ WORKSPACES│                     │                       │
│ ● mugiwara│  pane:1 ~/mug...   │  pane:2 ~/cmux-gpu    │
│ ○ cmux-dev│  ❯ cargo build     │  ❯ nvim renderer.rs   │
│ ○ perso   │    Finished 4.2s   │                       │
│           │  ❯ █               │                       │
│ TABS      ├─────────────────────┴───────────────────────┤
│ ▸ main    │                                             │
│   agents  │  pane:3  🤖 Claude Code  ● IDLE             │
│   tests   │  claude › Implémente le seqlock...          │
│   claude ⏺│  ✓ Created seqlock.rs                       │
│           │  ✓ Updated lib.rs                           │
│           │  claude › █                                 │
├──────────┴──────────────────────────────────────────────┤
│ WS:1 mugiwara | TAB:1 main | PANE:3 | 🤖×1 | ⎇ feat/  │
└─────────────────────────────────────────────────────────┘
```

- **Sidebar gauche** : workspace selector + tab list avec git branch, nombre de panes, statut Claude
- **Zone principale** : arbre de splits avec panes terminaux
- **Status bar** : workspace, tab, pane focus, agents Claude actifs, branche git

### 4.3 Keybinds par défaut

| Action | Raccourci |
|--------|-----------|
| New workspace | `Ctrl+Shift+N` |
| Switch workspace 1-9 | `Ctrl+1-9` |
| New tab | `Ctrl+T` |
| Close tab | `Ctrl+W` |
| Next/prev tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Split right | `Ctrl+D` |
| Split down | `Ctrl+Shift+D` |
| Close pane | `Ctrl+Shift+X` |
| Focus direction | `Alt+←↑→↓` |
| Resize split | `Alt+Shift+←↑→↓` |
| Zoom toggle | `Ctrl+Shift+Z` |
| Command palette | `Ctrl+Shift+P` |
| Toggle sidebar | `Ctrl+B` |
| Find | `Ctrl+Shift+F` |

### 4.4 Mutations du SplitTree

| Opération | Mutation |
|-----------|---------|
| Split right | `Leaf(p) → Split { Vertical, 0.5, Leaf(p), Leaf(new) }` |
| Split down | `Leaf(p) → Split { Horizontal, 0.5, Leaf(p), Leaf(new) }` |
| Close pane | Remove `Leaf(p)` → promote sibling to parent's position |
| Resize | `parent.ratio ± 0.05` |
| Focus direction | Walk tree → nearest `Leaf` in direction from current |

---

## 5. Persistance & Daemon Lifecycle

### 5.1 États du daemon

```
Off ──(auto-start)──▶ Running ──(GUI disconnect)──▶ Detached ──(timeout)──▶ Hibernating
                         ▲                              │                        │
                         └──────────(cmux attach)───────┘────────────────────────┘
```

- **Running** : daemon + GUI connecté, PTY actifs, shared memory active
- **Detached** : daemon seul, PTY vivants, pas de rendering
- **Hibernating** : PTY tués, snapshots sauvés, daemon minimaliste en attente

Détection via lock file `~/.cmux/daemon.lock` (contient PID). PID mort → cleanup + relance.

### 5.2 Couches de persistance

| Couche | Contenu | Stockage | Fréquence |
|--------|---------|----------|-----------|
| L1 — Live | PTY vivants, shared memory | RAM | Tant que le daemon tourne |
| L2 — Session | Layout complet (workspaces, tabs, splits, pane metadata) | `~/.cmux/sessions/current.json` | Chaque mutation (debounced 500ms) |
| L3 — Scrollback | Historique terminal par pane | `~/.cmux/scrollback/{pane_id}.bin` | Toutes les 30s + on shutdown |
| L4 — Snapshot | Screen buffer visible | `~/.cmux/snapshots/{pane_id}.bin` | On hibernate + graceful shutdown |

### 5.3 Structure fichiers

```
~/.cmux/
├── daemon.lock              # PID du daemon actif
├── daemon.sock              # Named pipe / Unix socket
├── config.toml              # Configuration globale
├── keybinds.toml            # Raccourcis personnalisables
├── theme.toml               # Couleurs, fonts, style
├── sessions/
│   ├── current.json         # État live (workspaces, tabs, splits)
│   └── backups/             # 5 derniers snapshots auto
├── scrollback/
│   └── pane_{id}.bin        # Ring buffer sérialisé par pane
├── snapshots/
│   └── pane_{id}.bin        # Screen buffer at hibernate
└── logs/
    ├── daemon.log
    └── gui.log
```

### 5.4 Scénarios de recovery

| Scénario | Ce qui survit | Recovery |
|----------|--------------|---------|
| GUI crash / close | ✅ Tout — PTY vivants, scrollback, layout | `cmux attach` → reconnexion instantanée |
| Daemon graceful shutdown | ✅ Layout + scrollback + screen snapshots | Auto-relance → restore layout, show snapshots, re-spawn PTY, propose re-exec des dernières commandes |
| Daemon crash (SIGKILL) | ⚠️ Layout + scrollback (dernière save) | Détection lock stale → cleanup → restore from last session JSON + scrollback files |
| Machine reboot | ⚠️ Layout + scrollback + snapshots | Daemon auto-start (registre Windows / systemd) → full restore avec proposition de re-exec |

---

## 6. OSC Interceptor & Intégration Claude Code

### 6.1 Stratégie de détection — 3 niveaux

| Niveau | Méthode | Résultat |
|--------|---------|----------|
| L1 — Process Tree | Polling `sysinfo` toutes les 2s, cherche `claude` / `claude-code` dans les fils du PTY | `is_claude_active: bool` par pane |
| L2 — OSC Sequences | vte parser filtre OSC 0 (titre), OSC 7 (cwd), OSC 9 (notification), OSC 633 (command boundaries VS Code shell integration) | cwd, titre, notifications, commandes |
| L3 — Output Patterns | Heuristique sur le texte affiché : `⏺ Thinking...`, `✓ Created`, `✗ Error`, `claude ›` | `ClaudeStatus { Idle, Thinking, ToolUse(tool), Error(msg) }` |

### 6.2 Event Bus

```rust
enum ClaudeEvent {
    SessionDetected { pane_id: PaneId, pid: u32 },
    SessionEnded { pane_id: PaneId },
    StatusChanged { pane_id: PaneId, status: ClaudeStatus },
    Notification { pane_id: PaneId, title: String, body: String, urgency: Urgency },
    FileModified { pane_id: PaneId, path: PathBuf, action: FileAction },
    ToolUsed { pane_id: PaneId, tool_name: String, duration_ms: u64 },
    CommandBoundary { pane_id: PaneId, command: String, exit_code: Option<i32>, duration_ms: u64 },
    CwdChanged { pane_id: PaneId, new_cwd: PathBuf },
}
```

Transport : MessagePack via le control socket (même canal que les commandes). Le GUI s'abonne aux events au connect. La CLI peut aussi s'abonner : `cmux events --follow --filter claude`.

### 6.3 Indicateurs visuels

- **Sidebar** : chaque tab affiche un badge de statut Claude (●IDLE vert, ⏺THINKING violet pulsant, 🔧ToolUse bleu, ✗ERROR rouge)
- **Pane borders** : couleur change selon le statut Claude (glow animé pour Thinking)
- **Notifications overlay** : popup avec résumé de l'action + boutons (Focus pane, Dismiss)

### 6.4 Futur — Intégration Mugiwara (phase 2)

Fonctionnalités prévues pour la phase 2, mais l'architecture de la phase 1 les prépare :
- **Agent Spawner** : `cmux agent spawn --skill chopper` → ouvre un pane, lance claude, injecte le prompt
- **Multi-Agent Dashboard** : vue dédiée avec tous les agents actifs, statut, logs, resource usage
- **Context Sharing** : panes Claude partagent un contexte projet, résultats d'un agent injectables dans un autre
- **Mugiwara Router** : command palette enrichie — "debug this" → spawn Chopper dans un nouveau pane

---

## 7. Configuration

### 7.1 config.toml

```toml
[daemon]
auto_start = true
detach_timeout = "30m"
scrollback_lines = 10000
save_interval_ms = 500
scrollback_flush_s = 30
log_level = "info"

[terminal]
shell = "pwsh.exe"          # Auto-detect si absent
env = { TERM = "xterm-256color", COLORTERM = "truecolor" }
cursor_style = "block"      # block | underline | bar
cursor_blink = true
bell = "visual"             # none | visual | audible

[gpu]
backend = "auto"            # auto | vulkan | dx12 | metal
vsync = true
frame_rate_cap = 0          # 0 = vsync

[claude]
detect = true
process_poll_ms = 2000
pattern_analysis = true
notifications = true
border_glow = true

[ui]
sidebar = true
sidebar_width = 220
statusbar = true
tab_bar_position = "sidebar"  # sidebar | top | hidden
notification_duration_s = 5
padding = { x = 8, y = 4 }
```

### 7.2 theme.toml

Thème par défaut : **Tokyo Night**. Compatible avec les schémas de couleurs Alacritty/Ghostty (conversion automatique).

- Deux fonts séparées : terminal (`JetBrains Mono`) et UI (`Inter`)
- Couleurs ANSI 16 (normal + bright)
- Section `[colors.ui]` pour sidebar, statusbar, borders, couleurs Claude par statut

### 7.3 keybinds.toml

Entièrement personnalisable, format `action = "modifiers+key"`. Sections : `[workspace]`, `[tab]`, `[pane]`, `[global]`. Voir section 4.3 pour les valeurs par défaut.

---

## 8. CLI

10 commandes principales via `clap` :

| Commande | Description | Exemple |
|----------|-------------|---------|
| `cmux start` | Lance le daemon | `cmux start --log-level debug` |
| `cmux attach` | Ouvre GUI + connecte | `cmux attach --workspace 2` |
| `cmux kill` | Arrête le daemon | `cmux kill --save` |
| `cmux ls` | Liste workspaces/tabs/panes | `cmux ls --format json` |
| `cmux new-workspace` | Crée un workspace | `cmux new-workspace --name "api" --cwd ~/api` |
| `cmux new-tab` | Crée un tab | `cmux new-tab --name "tests"` |
| `cmux split` | Split le pane actif | `cmux split --direction right --ratio 0.6` |
| `cmux send-keys` | Envoie des touches | `cmux send-keys --pane 3 "cargo test\n"` |
| `cmux focus` | Focus workspace/tab/pane | `cmux focus --workspace 1 --tab 2` |
| `cmux events` | Stream d'events | `cmux events --follow --filter claude` |
| `cmux snapshot` | Capture écran d'un pane | `cmux snapshot --pane 2 --output screen.txt` |

---

## 9. Contraintes & Décisions

| Décision | Choix | Justification |
|----------|-------|---------------|
| Stack | Rust pur, wgpu brut, UI custom | Performance GPU maximale, pas de webview overhead |
| Terminal engine | portable-pty + vte + rendering custom | Modulaire, chaque brique remplaçable |
| Layout model | Workspaces > Tabs > Splits (arbre binaire) | Maximum d'organisation, séparation par projet |
| Persistance | Daemon background (PTY snapshot) | Les sessions survivent à tout |
| IPC | Shared memory (ring buffer) + control socket (named pipe) | Latence quasi-nulle pour le flux terminal |
| Claude integration | Hybride (process terminal + OSC interception + output patterns) | Pas de modification du protocole Claude Code |
| Config format | TOML | Standard Rust, lisible, bien supporté |
| Timeline | Pas de contrainte | On fait bien, architecture complète avant code |

---

## 10. Hors scope (phase 1)

- Éditeur de code intégré (phase 3)
- File explorer (phase 3)
- Agent Spawner Mugiwara (phase 2)
- Multi-Agent Dashboard (phase 2)
- Context Sharing entre panes Claude (phase 2)
- Support distant / SSH attach (à évaluer)
- Plugin system (à évaluer)

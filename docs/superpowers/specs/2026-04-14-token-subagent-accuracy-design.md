# Token Calculation Accuracy — Subagent Tracking & Visual Breakdown

**Date:** 2026-04-14
**Status:** Approved
**Approach:** B — Enhanced parser with subagent tracking + parent link + machine field

---

## Problem

The token dashboard under-reports consumption because the parser (`tokens/parser.py:274`) uses `proj_dir.glob('*.jsonl')` which only scans root-level JSONL files. Claude Code stores subagent session logs in nested directories:

```
~/.claude/projects/<project>/
    <session-uuid>.jsonl                          ← SCANNED
    <session-uuid>/subagents/agent-*.jsonl        ← IGNORED
    <session-uuid>/subagents/agent-acompact-*.jsonl ← IGNORED
```

With heavy use of Mugiwara agent pipelines (one_piece, sanji, nami, etc.), the majority of actual token consumption is missed.

## Solution

### 1. Model Changes (`tokens/models.py`)

Add 3 fields to `TokenUsage`:

```python
is_subagent = BooleanField(default=False)
parent_session_id = CharField(max_length=100, blank=True, default='', db_index=True)
machine = CharField(max_length=100, default='', db_index=True)
```

- `is_subagent`: `True` when JSONL path contains `/subagents/`
- `parent_session_id`: UUID extracted from the parent directory name (e.g., `364619b8-.../subagents/agent-a77.jsonl` → `364619b8-...`)
- `machine`: `socket.gethostname()` at ingestion time (prepares multi-PC future)

Migration: 3x `AddField` with defaults, zero downtime.

### 2. Parser Changes (`tokens/parser.py`)

**`scan_all_sessions()`:**
- Replace `proj_dir.glob('*.jsonl')` with `proj_dir.rglob('*.jsonl')` to recurse into `<session>/subagents/` directories
- Add `import socket` and inject `machine=socket.gethostname()` into every record

**`_parse_session_file()` — new parameters:**
- Accept `is_subagent: bool` and `parent_session_id: str`
- Detection logic based on file path:
  - If path parts contain `subagents` → `is_subagent=True`
  - `parent_session_id` = name of the directory 2 levels up from the subagent file
  - For root-level `<uuid>.jsonl` → `is_subagent=False`, `parent_session_id=''`
- Inject all 3 new fields into each record dict

Idempotency preserved: `message_id` unique constraint + `bulk_create(ignore_conflicts=True)`.

### 3. View Changes (`tokens/views.py`)

**`tab_costs` (Costs tab):**
- KPIs (today/week/month/total) now automatically include subagent data (queryset includes all records)
- Add sub-text under each KPI: "dont $X.XX subagents (Y%)" via `qs.filter(is_subagent=True).aggregate(Sum('cost'))`

**`tab_technical` (Technical tab):**
- Total Tokens KPI is now correct (includes subagents)
- New donut chart: "Main vs Subagents" — 2 segments showing token split between main sessions and subagents

**`tab_sessions` (Sessions tab):**
- Session aggregation groups by `session_id` on main sessions
- Each session row's `total_tokens` and `total_cost` includes its subagents (join via `parent_session_id == session_id`)
- New column "Subagents" showing count of linked subagents per session (badge pill)

**`session_detail` (Drawer):**
- Header shows "Total (main + N subagents)"
- Message table split into 2 sections:
  1. Main session messages (white background)
  2. Subagent messages (light tinted background), grouped by subagent, prefixed with short agent name (from filename)
- Subtotals per section + grand total

No new routes or templates — enrichment of existing partials only.

### 4. Template Changes

**`_tab_costs.html`:**
- `<span>` under each KPI card: "dont $X.XX subagents (Y%)" in muted gray

**`_tab_technical.html`:**
- New donut chart block "Main vs Subagents" after Token Composition donut
- Center label shows combined total

**`_tab_sessions.html`:**
- New "Subagents" column header
- Badge pill per row (e.g., "3 agents" or "—")
- Visual indicator on rows that include subagent costs

**`_session_detail.html`:**
- Header: "Total (main + N subagents)"
- Two-section message table with distinct background tints
- Per-section subtotals + grand total

### 5. Management Command

`ingest_tokens.py` already calls `scan_all_sessions()` — no changes needed beyond what the parser provides. Stats output will naturally show higher record counts.

### 6. Files Modified

| File | Change |
|------|--------|
| `tokens/models.py` | +3 fields |
| `tokens/migrations/0002_*.py` | Auto-generated migration |
| `tokens/parser.py` | `rglob`, subagent detection, machine field |
| `tokens/views.py` | Subagent aggregations in 4 views |
| `tokens/templates/tokens/partials/_tab_costs.html` | Subagent % sub-text |
| `tokens/templates/tokens/partials/_tab_technical.html` | New donut chart |
| `tokens/templates/tokens/partials/_tab_sessions.html` | Subagents column |
| `tokens/templates/tokens/partials/_session_detail.html` | Two-section message table |

### 7. Out of Scope

- Multi-PC import mechanism (field `machine` is prepared but no import UI)
- Ephemeral cache subtypes (`ephemeral_5m_input_tokens`, `ephemeral_1h_input_tokens`) — tracked by the existing `cache_creation_input_tokens` field
- Pricing table updates (current rates are correct as of April 2026)
- New model aliases (handled gracefully by fallback to default tier)

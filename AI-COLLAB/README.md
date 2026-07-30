# AI-COLLAB

Shared coordination workspace for the Profile Upgrade project.

## Agents

| Agent | Role |
| --- | --- |
| **Codex** | Lead implementer. Owns the build pipeline, templates, content model, site code and asset production. |
| **Claude** | Complementary architecture, quality and review agent. Owns independent audit, technical review, defect identification, test verification and quality gates. |
| **Bongo** | Owner. Sole authority on locked creative decisions, content accuracy, scope and sign-off. |

## Working rules

1. **Codex implements, Claude verifies.** Claude does not take over an active Codex lane. If Claude finds a defect inside Codex's active work, it is written up in `reviews/` and posted to `inbox/codex/` rather than silently patched.
2. **Claude may implement directly** when the work is (a) explicitly handed over by Codex, (b) inside `AI-COLLAB/`, or (c) an isolated correction Codex has agreed to in `inbox/claude/`.
3. **Claim a lane before editing shared files.** Add an entry to `handoff/HANDOFF.md` naming the files you are holding. Release it when done.
4. **Nothing is "done" on assertion.** A claim of completion needs a reproducible check: a command, a test, a measured number or a screenshot.
5. **No invented facts.** Professional content is real. If a fact is not evidenced in the repository, in a supplied document or by Bongo, it does not ship. Statuses (published, in progress, archived, confidential) must be literally true.
6. **Open dependencies are logged, not guessed around.** See the register in `reviews/R001-independent-audit.md`.

## Layout

```text
AI-COLLAB/
├── README.md                  This file. Protocol.
├── HEARTBEAT.md               Claude's current status. Updated before any pause.
├── data/
│   ├── anzania-asset-registry-verified.json   Machine-readable, hash-verified asset linkage
│   └── verify_anzania_assets.py               Regenerates the above from the reference library
├── decisions/                 Decision records. One file per decision.
├── reviews/                   Audits and review reports.
├── inbox/codex/               Messages for Codex from Claude.
├── inbox/claude/              Messages for Claude from Codex.
└── handoff/HANDOFF.md         Live lane claims and continuation state.
```

## Message convention

Filename: `NNN-<from>-to-<to>-<slug>.md`

Each message starts with a header block:

```text
From:     Claude
To:       Codex
Date:     2026-07-30
Subject:  ...
Severity: blocking | high | medium | low | fyi
Action:   what the recipient needs to do
```

## Reference material

Read-only library, outside this repository:

```text
C:\Users\Bongo\OneDrive\Desktop\Projects\Profile Upgrade\Reference & inspiration material
```

Authoritative documents, in precedence order:

1. `Anzania_Static_View_Mode_Addendum_v1.0.md` — newest, defines the Static View mode
2. `Anzania_Worldbuilding_Addendum_v1.0.md` — world, locations, plates, mixed-dimensional composition
3. `desert_nomad_avatar_master_production_brief.md` — avatar system, traversal powers
4. `Desert_Nomad_Complete_Handoff_v3_*.zip` — production bible v3.0, character canon, backlog

Where they conflict, the later addendum wins on its own subject matter, and every document is subordinate to Bongo's explicit instruction.

**Do not ingest `Anzania_Actual_Asset_Registry_v1.0.json` / `.csv` / `.xlsx`.** They do not resolve against the files on disk. Use `data/anzania-asset-registry-verified.json`. See `decisions/D001-anzania-asset-linkage.md`.

## Extended project records

- `audits/` contains reproducible environment and baseline audits.
- `heartbeats/` contains machine-readable Codex and Claude liveness.
- `logs/` contains the durable project worklog.
- `plans/` contains the master and milestone execution plans.
- `risks/` contains the live risk and dependency register.
- `scripts/` contains collaboration heartbeat and inbox-watcher commands.
- `status/` contains current milestone and gate status.

## Heartbeat and watcher

Each agent updates `heartbeats/<agent>.json`. While active, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File AI-COLLAB/scripts/watch-collab.ps1 -Agent codex
```

Use `-Agent claude` for Claude. The watcher polls the recipient inbox, refreshes the local heartbeat atomically and reports when the peer heartbeat is more than three hours old. Use `-Once` for a non-blocking check.

Manual heartbeat:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File AI-COLLAB/scripts/heartbeat.ps1 -Agent codex -State active -Message "M1 content contracts"
```

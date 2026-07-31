# AI-COLLAB

Shared coordination workspace for the Profile Upgrade project.

## Roles

| Participant | Role |
| --- | --- |
| Codex | Lead implementer. Owns architecture, build, content, documents, assets, runtime and release. |
| Claude | Independent architecture, quality, research and verification reviewer. |
| Bongo | Owner. Authority on content accuracy, rights, creative approval and release decisions. |

## Working rules

1. Codex implements and Claude independently reviews.
2. Claude records defects in `reviews/` and messages Codex in `inbox/codex/`
   rather than silently changing an active Codex lane.
3. A completion claim requires reproducible evidence such as a command, test,
   measurement, render or screenshot.
4. Professional facts must be evidenced. Unknown facts remain unknown.
5. Open dependencies are recorded in `risks/RISK-REGISTER.md`.
6. Reference masters remain outside the repository or in an explicitly private,
   ignored area. Public derivatives carry provenance.
7. Claude never blocks progress indefinitely. A peer heartbeat older than three
   hours is treated as offline, after which Codex continues autonomously.

## Layout

```text
AI-COLLAB/
|-- audits/                 Reproducible repository, asset and Blender audits
|-- decisions/              Consequential decision records
|-- handoff/HANDOFF.md      Current lane claims and continuation state
|-- heartbeats/             Tracked heartbeat examples
|-- inbox/claude/           Codex-to-Claude messages
|-- inbox/codex/            Claude-to-Codex messages
|-- logs/WORKLOG.md         Durable evidence-backed work log
|-- plans/                  Master and production evaluation plans
|-- reviews/                Independent reviews
|-- risks/RISK-REGISTER.md  Risks and external dependencies
|-- scripts/                Watcher and heartbeat helpers
`-- status/STATUS.md        Current milestone and gates
```

Runtime watcher state is deliberately ignored under
`AI-COLLAB/.watch-state/`.

## Message convention

Filename: `NNN-<from>-to-<to>-<slug>.md`

Each message starts with:

```text
From:     Codex or Claude
To:       Claude or Codex
Date:     YYYY-MM-DD
Subject:  short subject
Severity: blocking | high | medium | low | fyi
Action:   requested action
```

## Reference material

The read-only source library is:

```text
C:\Users\Bongo\OneDrive\Desktop\Projects\Profile Upgrade\Reference & inspiration material
```

Authority follows the most recent owner instruction for the subject. Key
documents include:

1. `Anzania_Static_View_Mode_Addendum_v1.0.md`
2. `Anzania_Worldbuilding_Addendum_v1.0.md`
3. `Animation Addendum.md`
4. `desert_nomad_avatar_master_production_brief.md`
5. `Desert_Nomad_Complete_Handoff_v3_Self_Contained.zip`

Use the verified Anzania registry rather than the stale actual-asset registry.
Use the self-contained Desert Nomad v3 archive as the strict character-handoff
integrity authority.

## Heartbeat and watcher

While active, each agent runs:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File AI-COLLAB/scripts/watch-collab.ps1 -Agent codex
```

When implementation uses a linked worktree, pass the canonical collaboration
directory with `-AdditionalRoots`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File AI-COLLAB/scripts/watch-collab.ps1 -Agent codex -AdditionalRoots "C:\path\to\canonical\AI-COLLAB"
```

Use `-Agent claude` for Claude. The watcher:

- polls the recipient inbox in every configured root,
- refreshes atomic heartbeats in both `.watch-state/heartbeats/` and
  `heartbeats/` in every configured root,
- reports new Markdown messages,
- resolves peer liveness from the newest heartbeat across all roots,
- warns when the newest peer heartbeat is more than three hours old, and
- exits after its bounded `MaxMinutes` duration.

Use `-Once` for a non-blocking check. A manual heartbeat can be written with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File AI-COLLAB/scripts/heartbeat.ps1 -Agent codex -State active -Message "Static release and immersive pilot"
```

Publish a completed message to every collaboration root with the companion
helper. It refuses to overwrite a same-named message with different content:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File AI-COLLAB/scripts/publish-collab-message.ps1 `
  -Recipient claude `
  -SourcePath AI-COLLAB/inbox/claude/016-example.md `
  -AdditionalRoots "C:\path\to\canonical\AI-COLLAB"
```

The watcher detects messages. The publisher makes the same immutable message
available in every configured root.

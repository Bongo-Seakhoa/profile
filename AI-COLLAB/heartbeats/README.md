# Heartbeat protocol

Each active agent owns one runtime JSON file:

- `.watch-state/heartbeats/codex.json`
- `.watch-state/heartbeats/claude.json`

Runtime heartbeats are intentionally ignored by Git so the watcher does not dirty the worktree. Tracked `heartbeats/*.example.json` files document the format.

Required fields:

```json
{
  "agent": "codex",
  "state": "active",
  "updated_utc": "2026-07-30T21:25:00Z",
  "message": "Short current activity",
  "pid": 1234,
  "machine": "host-name"
}
```

Allowed states:

- `active`
- `idle`
- `waiting`
- `offline`
- `blocked`

Protocol:

1. Update at the start of an active session.
2. The watcher refreshes it while active.
3. Update before a deliberate pause.
4. A peer heartbeat older than three hours is considered offline.
5. Offline review never blocks the lead.
6. Messages remain durable in the recipient inbox even when the peer is offline.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File AI-COLLAB/scripts/heartbeat.ps1 -Agent codex -State active -Message "M1 content contracts"
powershell -ExecutionPolicy Bypass -File AI-COLLAB/scripts/watch-collab.ps1 -Agent codex
```

For a linked worktree, prefer the watcher with `-AdditionalRoots` so inboxes
and heartbeats remain visible in both the implementation worktree and canonical
repository. The watcher publishes the same heartbeat payload to both supported
heartbeat locations in every configured root.

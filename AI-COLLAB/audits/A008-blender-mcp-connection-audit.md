# A008 - Blender MCP connection audit

**Date:** 2026-07-31  
**Owner:** Codex  
**Scope:** Installed Blender 5.2 Blender Lab MCP extension and current Codex
connection state  
**Result:** Installed but not connected; non-blocking

## Installed extension

The Blender 5.2 preferences show the Blender Lab `mcp` extension enabled at
version 1.0.0. Its installed manifest requires Blender 5.1 or newer and
declares a local TCP network permission.

The audited files are under:

`C:\Users\Bongo\AppData\Roaming\Blender Foundation\Blender\5.2\extensions\user_default\mcp`

| File | SHA-256 |
| --- | --- |
| `blender_manifest.toml` | `EF0BECF6FAF13F6EA2BCDCCF2DC68AA4DE9E9E95CEC8FB8AC3C5E3784E28407C` |
| `__init__.py` | `42C618AA4CAB373529524FD58C6F26B8C84D56FFEF17B2DB1EDC2DF3BE914C8D` |
| `mcp_to_blender_server.py` | `4080B91FB4F8B648209BA850ACBFA143E8D2EDE385F1D7DB5C198E483304E50A` |
| `weak_sandbox.py` | `0BF7A6B4BF0BE7AB16A758D38C386E930B9D7DE44C3F12550FEFF235E0ECC47B` |

## Connection behavior

- The default bridge address is loopback `localhost:9876`.
- Interactive auto-start defaults to enabled with a 1 second delay.
- Manual and automatic start require Blender online access.
- Background use additionally requires `--online-mode` and
  `--command blender_mcp`.
- GUI Blender PID 21424 was responsive during the audit but owned no listening
  socket, and no process was listening on port 9876.
- The active Codex configuration contains no Blender MCP server and the task
  exposes no Blender-named MCP tool.
- No `uv`, `uvx` or `blender-mcp` companion executable was found on the
  available command path.

The extension alone therefore cannot be called from this task. The saved
binary Blender preferences do not safely reveal whether the absent listener is
caused by disabled online access, disabled auto-start or a start error without
loading and interacting with the user's GUI session. That session is not owned
by Codex and was not changed.

## Security boundary

The bridge executes received code directly and labels its own protection a
weak sandbox. It blocks only a narrow set of exit and Blender operators. It
must remain loopback-only, version-pinned and isolated from untrusted prompts
or networks.

## Production decision

The deterministic headless Blender lane remains the production authority:

- every launched process is owned and recorded;
- source, command line, logs, reports and recovery files are reproducible;
- cloth, topology, fit and export thresholds fail closed; and
- the user-owned GUI Blender process is never stopped or repurposed.

Blender MCP may later be used as an interactive inspection and correction
sidecar after an official companion is configured and a fresh task exposes its
tools. It does not replace the headless acceptance pipeline and is not a
current project blocker.

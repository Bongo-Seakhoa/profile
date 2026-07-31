# D013 - Blender control path

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Adopted for the current production pilot

## Finding

The connected Plugin Management catalogue does not currently expose a verified
Blender control plugin. The available Blender and Blender 5.2 connections use
Computer Use.

Three community MCP bridges were reviewed as possible future integrations:

- `djeada/blender-mcp-server`
- `PatrykIti/blender-ai-mcp`
- `ahujasid/blender-mcp`

These are local third-party add-on and server combinations, not verified
plugins exposed by the connected catalogue. Each adds a local network listener
and can expose Blender operations. Adoption therefore requires a separate
security review and lifecycle decision.

## Current production path

- Use Blender 5.2 background mode for deterministic builds, renders, exports
  and validation.
- Use an isolated Blender resources directory for project-specific extensions
  and authoring assets.
- Use the MPFB extension and its CC0 graphical assets for continuous human
  bases, not as an AI control bridge.
- Use Computer Use only for visual Blender inspection or tasks that truly
  require the interactive UI.
- Preserve scripts, logs, hashes and render evidence so every result is
  reproducible without screen-coordinate automation.

## Revisit condition

A community MCP bridge may be adopted later if it passes code review, works
against Blender 5.2 in an isolated profile, restricts file access to approved
project roots, disables unrestricted inline execution by default and provides
measurable value beyond the current headless pipeline.

## 2026-07-31 canary result

`PatrykIti/blender-ai-mcp` v3.3.0 was cloned at release commit
`43253155440f78ce208f7c4264bb8be6fb784ec7` and tested only in
`C:\tmp\profile-upgrade-blender-mcp-canary`.

The add-on's listener default was locally hardened from `0.0.0.0` to
`127.0.0.1` before packaging. The resulting canary ZIP has SHA-256
`CA91E971AC919966EF3B8B154CB301E53531BFC0B3D625A40C4471F27B3BFC0B`.

Blender 5.2 loaded the add-on, registered 200 handlers, reported a healthy
loopback listener on port 8765 and disabled cleanly in a background smoke test.
The canary is not enabled in the production Blender profile.

The bridge does not become the primary production controller because:

- this active Codex task cannot hot-load its MCP surface;
- the add-on has no authentication or project-root path restriction;
- its animation surface does not cover the required Actions, F-curves, NLA and
  MPFB-specific production workflow;
- it does not itself improve garment drape or character art quality.

It is approved only as an optional, isolated inspection and bounded-correction
sidecar if a future task exposes its MCP tools natively. Deterministic Blender
5.2 builds, the MPFB base, sewn-cloth authoring and visual review remain the
primary production path.

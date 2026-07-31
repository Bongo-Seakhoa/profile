# D018: Opt-in immersive runtime architecture

**Date:** 2026-07-31  
**Owner:** Codex  
**Architecture audit:** Codex architecture subagent  
**Independent reviewer:** Claude, pending implementation review  
**Status:** Adopted for implementation

## Context

The camera and animation modules are deterministic TypeScript contracts, but
the repository does not yet contain a browser renderer, scene host, verified
runtime loader, post-skinning bounds sampler, object-mask verifier, WebGL
recovery path or immersive route. Existing release validators correctly
protect Static View by rejecting JavaScript, canvas, WebGL assets and motion,
but currently apply those rules to the entire deployment. That prevents an
explicitly opted-in immersive surface from coexisting with the static site.

The owner requires both experiences. Static View must remain a complete,
professional, zero-JavaScript fallback. Immersive View must eventually ship the
complete approved 15-character, 16-location, animation, power and effects
scope rather than a public placeholder.

## Decision

- Add an opt-in `/explore/` surface with a permanent direct link back to Static
  View. The heavy runtime is imported only after explicit entry.
- Use a directly owned, pinned Three.js `WebGLRenderer` runtime. Do not add
  React, React Three Fiber, `OrbitControls` or another camera authority.
- Keep the existing `FullBodyFramingController` as the only framing authority.
  The render adapter must implement its distant full-body composition through
  a shared off-axis projection contract, never through head, neck or shoulder
  targeting and never through an OTS camera.
- Split validation by route-reachable request graph. Every Static View route
  and every recursively reachable Static asset must retain the current
  zero-JavaScript, no-canvas, no-GLB/WASM, no-motion and Static budget gates.
  Immersive assets receive separate schema, integrity, performance and total
  release gates. A split is not permission to weaken Static checks.
- Load only content-addressed, manifest-declared, self-contained production GLB
  packages. Fetch bytes first, verify their complete SHA-256 digest with Web
  Crypto, and only then parse them.
- Require KTX2/Basis textures and meshopt-compressed geometry for production
  packages. Decoder versions and copied decoder files are release metadata.
- Sample active skinned meshes, rigid attachments, cloth or power proxies and
  outgoing plus incoming LOD bounds after animation and world-matrix updates.
  Feed that exact-frame union into the framing controller before rendering.
- Use the real render-camera projection as the production containment proof and
  the mathematical projection probe as an independent cross-check.
- Restrict object-ID-mask rendering to verification and telemetry modes. It
  must fail unknown contributors, pixels outside the safe envelope, unapproved
  total occlusion and disagreement with conservative animated bounds.
- On WebGL context loss, stop input and rendering, preserve logical state only,
  rebuild all GPU resources from verified bytes, and make at most two bounded
  recovery attempts before restoring the permanent Static View fallback.
- Scope any future service worker to `/profile/explore/` and register it only
  after opt-in. It must never control Static View routes.
- Keep the public Explore navigation entry disabled until the complete roster,
  location, animation, effects, browser and performance acceptance matrix
  passes. A mechanical fixture may prove integration but cannot be represented
  as a release character or reduce public scope.

## Version baseline

The implementation baseline is exact-version pinned:

| Package | Version | Role |
| --- | ---: | --- |
| `three` | `0.185.1` | Browser renderer and glTF runtime |
| `@types/three` | `0.185.1` | TypeScript declarations |
| `meshoptimizer` | `1.2.0` | Browser meshopt decoder |
| `@gltf-transform/core` | `4.4.2` | Build-time glTF inspection |
| `@gltf-transform/extensions` | `4.4.2` | Build-time extension support |
| `@gltf-transform/functions` | `4.4.2` | Build-time optimization and validation |

Versions were checked against the official npm registry on 2026-07-31. The
runtime setup follows the official Three.js
[`GLTFLoader`](https://threejs.org/docs/pages/GLTFLoader.html) and
[`KTX2Loader`](https://threejs.org/docs/pages/KTX2Loader.html) contracts,
including `setKTX2Loader`, `setMeshoptDecoder`, `setTranscoderPath` and
`detectSupport` before decoding.

Changing a pin requires a new compatibility, decoder-hash, build, browser and
asset-validation audit. Dependency ranges are not permitted for these runtime
packages.

## Frame order

1. Resolve destination, input and animation state.
2. Advance the Three.js animation mixer, root transform and approved secondary
   motion.
3. Update world matrices and skeletons.
4. Sample the complete active animated silhouette and transition LOD union.
5. Update HTML, visual-viewport and safe-zone registrations.
6. Solve the full-body camera.
7. Apply the same off-axis projection contract to the real render camera and
   reproject all eight envelope corners.
8. Assert containment, render, and optionally run the independent object-mask
   verifier.

The renderer may increase radius, orbit, elevate or shift the projection to
meet containment. It may not crop, switch to OTS, omit active accessories or
zoom into an interaction gesture.

## Release boundary

Runtime plumbing may be built and tested before the pilot character is
accepted. No placeholder, blockout, stick figure or mechanical fixture becomes
public character evidence. Production integration begins with the accepted
DN-M-AFR-01 combined GLB and a real Threshold Dunes environment, then scales
through the complete roster and location matrix before public enablement.

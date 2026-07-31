# D012 - Continuous character base and runtime packaging

**Date:** 2026-07-31
**Owner:** Codex
**Status:** Adopted for the DN-M-AFR-01 production pilot
**Supersedes:** D011 prototype weighting allowance and separate-file LOD packaging

## Reason

The procedural DN-M-AFR-01 construction pass was useful for measurement and
design decomposition, but its disconnected primitives, rigid one-bone weights
and paper-like garment panels cannot reproduce the approved silhouette at
production quality. The owner has explicitly rejected the stick-figure result.

The public character metadata gate also describes one self-contained primary
GLB containing all five LOD records. D011 described five independent GLBs,
which could not be represented honestly by that gate.

## Authoring base

- The primitive builder remains a private measurement scaffold only.
- Production characters use a continuous skinned human mesh as their anatomical
  base.
- The DN-M-AFR-01 pilot uses MPFB 2.0.17 inside an isolated Blender 5.2
  workspace.
- MPFB core graphical assets are CC0. The MPFB program code remains under its
  own GPL license and is not copied into the public portfolio.
- The pilot uses the official African male skin, eye and appropriate short-hair
  assets only as authoring inputs. Their exact source identifiers and hashes
  remain in private provenance records.
- The supplied owner-controlled concept board remains the design authority for
  silhouette, garments, palette, jewellery, pouch placement, footwear and the
  single right-side blue tassel.

## Rig consequence

- The MPFB game rig supplies continuous shoulder, elbow, hip, knee, hand and
  finger deformation.
- Required core bones are renamed to the exact `anzania-humanoid-v1`
  convention.
- Finger bones are retained as additional deform bones so pointing, presenting
  and hourglass gestures can be authored credibly.
- D011 sockets are added as non-deforming bones and must survive export.
- Every runtime vertex is limited to four normalized influences.
- Rigid one-bone assignment is allowed only for genuinely rigid accessories,
  such as buckles or pouch hardware. It is not allowed for the body, sleeves,
  trousers, tabard, mantle or other deforming cloth.

## Garment consequence

- Soft garments follow the two-stage sewn-cloth workflow in D014.
- Every garment and accessory also follows the physical dressing and attachment
  dependency graph in D016.
- Stage 1 is an authoring operation: quad patterns are sewn and simulated
  layer by layer against the MPFB collision mannequin, then baked, cleaned,
  thickened and saved as versioned garment assets.
- Stage 2 is the deterministic production build: approved baked garments are
  loaded, weighted, validated, optimized and packaged without rerunning cloth
  simulation.
- Tunic, sleeves, trousers, scarf or cowl, mantle and tabard receive
  transferred deform weights from the continuous body. Rigid belts, buckles,
  pouches, jewellery and footwear fittings remain conventionally modeled.
- The authoring record preserves pattern, seam, pin, collider, cache, baked and
  cleaned checkpoints so an upper layer can be revised without rebuilding
  accepted lower layers.
- Garment construction must be reviewed at all exported animation extremes.
- Subdivision cannot be used to disguise unsupported single-polygon panels.

## Runtime package

- The canonical browser package is one self-contained GLB containing named
  `LOD0` through `LOD4` character nodes.
- The combined file carries one rig, one required compact action set and the
  complete required socket set.
- Each LOD remains independently measurable against the D011 triangle,
  draw-call and texture-edge budgets.
- A future loader may extract or stream per-LOD derivatives only after the
  public schema is deliberately extended to represent an asset set.
- No public manifest may pretend that five unrelated GLBs form one
  self-contained primary resource.

## Release boundary

The MPFB installation, raw authoring inputs, source blend files, review renders
and intermediate exports remain private. A combined GLB becomes public only
after export and re-import checks, exact metadata validation, browser
full-body containment checks, performance testing and visual approval pass.
No OTS camera, marker, metadata value or fallback is permitted.

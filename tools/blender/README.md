# Blender reconstruction tools

These scripts use Blender's native Python API because Blender 5.2 exposes scene,
mesh, material, render and validation automation through `bpy`. They are not
part of the resume/CV pipeline, which remains JavaScript and Chromium only.

## DN-M-AFR-01 pilot

`build_dn_m_afr_01_blockout.py` creates a deliberately simple, dimensioned
greybox from the verified v3 canonical measurements. It writes:

- a private `.blend` reconstruction scene;
- front, profile and back EEVEE review renders; and
- a machine-readable measurement report.

The output is not a final sculpt and is not public-release material. Run it with
an explicit private output directory:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' `
  --background `
  --factory-startup `
  --python tools\blender\build_dn_m_afr_01_blockout.py `
  -- `
  --output-root source\private\immersive\pilot\DN-M-AFR-01\blender-blockout
```

D010 resolves the rights and silhouette gates, and A004 records a passing
measurement overlay. The pilot may proceed into production modelling, garment,
rig, deformation, animation, LOD, export and camera-containment validation.

## Production character and garment authoring

`build_dn_m_afr_01_mpfb_production.py` is the active Blender 5.2 and MPFB
production builder. Its current pilot path uses:

- one continuous MPFB body and the versioned humanoid rig contract;
- two-dimensional garment pieces arranged in a shallow pre-wrap;
- cloth sewing, body or accepted-lower-layer collision, point-cache bake,
  modifier application and topology cleanup;
- immutable lower-layer checkpoints before the next physical dressing layer;
  and
- private diagnostic reports and four-view review renders.

`sewn_cloth_canary.py` is the small deterministic proof for Blender's sewing,
pinning, collision, point-cache bake and cleanup path. It is not a character
asset.

The production dressing order and numeric gates are defined in D016 and A007.
Body-derived shells may assist authoring, but they are hidden helper surfaces
and can never count as accepted visible garments.

## Dressing-stack validation

`dressing_stack_validator.py` is the standalone fail-closed D016 validator.
It reads evaluated Blender meshes and checks the dependency graph, accepted
base evidence, named physical targets, distributed surface gaps, signed
penetration, connected penetration area, attachment roots and proxy-to-final
parity. See `DRESSING_STACK_VALIDATOR.md` for metadata and command details.

The `base` profile requires only the body, sewn tunic and sewn trousers while
retaining their complete geometry gates. The default `full` profile requires
all 18 canonical DN-M-AFR-01 layers. Neither profile replaces the required
fold, seam, silhouette, canon or multi-view visual review.

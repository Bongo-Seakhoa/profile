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

The pilot remains gated on rights confirmation, owner silhouette approval and a
signed measurement overlay before final sculpting.

# D016 dressing-stack validator

`dressing_stack_validator.py` is the fail-closed acceptance gate for physical
clothing order and attachment fit. It is read-only and measures evaluated
Blender meshes after modifiers, armature deformation and the selected pose.

The validator checks:

- the binding DN-M-AFR-01 dependency DAG from D016;
- required logical layers and accepted base-garment evidence;
- `layerId`, `dependsOn`, `collisionTargets` and `attachmentTarget` metadata;
- full-surface signed penetration against every declared physical target;
- distributed signed `p05`, `p95` and maximum gap over named support masks;
- connected surface area deeper than the universal 1 mm penetration threshold;
- attachment-root distance to the named dressed target;
- proxy-to-final one-sided sampled Hausdorff distance and parity diagnostics;
- D016 contact zones whose declared limits are at least as strict as the
  canonical limits; and
- dynamic penetration depth and persistence over multiple sampled frames.

## Object metadata

The repository's existing `dressing*` property names remain supported, but the
short canonical form is preferred for new accepted assets.

```json
{
  "layerId": "40-cowl",
  "dependsOn": [
    "10-base-tunic-sleeves-and-skirt",
    "11-base-trousers",
    "20-front-tabard",
    "30-fitted-waist-belt",
    "31-belt-collision-proxy",
    "32-right-pouch-collision-proxy",
    "33-left-pouch-collision-proxy"
  ],
  "collisionTargets": ["00-body", "10-base-tunic-sleeves-and-skirt"],
  "attachmentTarget": "10-base-tunic-sleeves-and-skirt",
  "attachmentRootVertexGroup": "CowlPins",
  "contactContracts": [
    {
      "zone": "cowl-support",
      "target": "10-base-tunic-sleeves-and-skirt",
      "sourceMask": "CowlShoulderSupport",
      "p95MinM": 0.002,
      "p95MaxM": 0.008,
      "maximumGapM": 0.012
    }
  ],
  "fitGateStatus": "accepted-production-cloth"
}
```

Blender custom-property arrays can be encoded as compact JSON strings using
`dressingDependsOnJson`, `dressingCollisionTargetsJson` and
`dressingContactContractsJson`.

Every contact contract requires a source vertex group. Optional `targetMask`
selects a target vertex group and fails when that group is absent or empty. A
single nearest vertex is never accepted as contact evidence.

Simulation-only form surfaces can opt out with both
`dressingValidationExclude=true` and a non-empty
`dressingValidationExcludeReason`. The object must retain an explicit helper
layer ID such as `05-tunic-form-proxy`. This exception is intentionally narrow:
none of the 18 canonical D016 layers can exclude itself, including authoring-only
31/32/33 belt and pouch collision proxies. Every honored exclusion is listed in
`excludedAuthoringHelpers` in the JSON report. `authoringOnly` by itself never
skips validation.

An attachment declares either `attachmentRootVertexGroup` or stable evaluated
indices in `attachmentRootVertexIndicesJson`. Production assets should prefer a
named group. A final object aligned to a cloth collision proxy also declares:

```json
{
  "proxyLayerId": "32-right-pouch-collision-proxy",
  "proxyParityTargetVertexGroup": "GarmentFacingSurface"
}
```

The proxy declares `proxyParitySourceVertexGroup` for the exact surface that
supported the earlier cloth solve. The validator measures that proxy surface
toward the final evaluated surface. The D016 5 mm limit is one-sided so a final
pouch cannot silently retreat from the volume used to drape the mantle.

External evaluated support surfaces such as the review ground plane use
`dressingSurfaceId="@ground"`. The `sole-ground` contract then targets
`@ground`; an absent ground mesh is a hard failure.

## Blender command

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' `
  --background path\to\character.blend `
  --python tools\blender\dressing_stack_validator.py `
  -- `
  --output path\to\dressing-stack-validation.json `
  --character-id DN-M-AFR-01 `
  --profile full `
  --frames 1,12,24,36,48
```

One frame runs static gates. Multiple frames also run the dynamic 3 mm depth
and two-consecutive-sample persistence limits. The process exits with code 0
only when the full graph, metadata and geometry report is accepted; rejection
uses exit code 2 and still writes the complete JSON evidence.

`--profile base` is the authoring checkpoint for `00-body`,
`10-base-tunic-sleeves-and-skirt` and `11-base-trousers`. It runs the complete
base metadata and evaluated-surface gates without reporting the 15 later layers
as missing. `--profile full` remains the default release gate and requires all
18 canonical D016 layers. A partial profile cannot produce a full acceptance
report.

## Builder import

```python
from dressing_stack_validator import validate_blender_scene

evidence = validate_blender_scene(
    character_id="DN-M-AFR-01",
    profile="full",
    frames=(1, 12, 24, 36, 48),
)
if not evidence["accepted"]:
    raise RuntimeError("D016 dressing stack rejected")
```

The active builder should import this module only after it owns accepted,
versioned base garments and complete metadata. Provisional or smoke-only base
garments always reject the stack.

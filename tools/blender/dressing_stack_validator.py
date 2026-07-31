"""D016 physical dressing-stack acceptance validator for Blender 5.2.

The module deliberately separates graph/contract validation from the Blender
adapter.  The pure functions can be imported by normal Python tests.  Geometry
is always sampled from evaluated Blender meshes when ``validate_blender_scene``
is used, so modifiers, armature deformation and the active pose are included.

The validator is read-only.  It never applies modifiers, changes object
transforms or writes custom properties.  A production builder can import
``validate_blender_scene`` and embed its returned JSON-compatible dictionary in
the build report, or the file can be run directly with Blender's ``--python``
argument.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

try:  # Blender-only imports remain optional for pure unit tests.
    import bpy  # type: ignore[import-not-found]
    from mathutils import Vector  # type: ignore[import-not-found]
    from mathutils.bvhtree import BVHTree  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - exercised outside Blender.
    bpy = None
    Vector = None
    BVHTree = None


SCHEMA_VERSION = "d016-dressing-stack-validation/v1"
M2_PER_MM2 = 1.0e-6

LAYER_ID_KEYS = ("layerId", "dressingLayerId")
DEPENDS_ON_KEYS = (
    "dependsOn",
    "dependsOnJson",
    "dressingDependsOnJson",
)
COLLISION_TARGET_KEYS = (
    "collisionTargets",
    "collisionTargetsJson",
    "dressingCollisionTargetsJson",
)
ATTACHMENT_TARGET_KEYS = ("attachmentTarget", "dressingAttachmentTarget")
CONTACT_CONTRACT_KEYS = (
    "contactContracts",
    "contactContractsJson",
    "dressingContactContractsJson",
)
ROOT_GROUP_KEYS = ("attachmentRootVertexGroup", "dressingRootVertexGroup")
ROOT_INDICES_KEYS = (
    "attachmentRootVertexIndices",
    "attachmentRootVertexIndicesJson",
)
PROXY_LAYER_KEYS = ("proxyLayerId", "dressingProxyLayerId")


@dataclass(frozen=True)
class ValidationThresholds:
    """Universal hard limits from D016, expressed in metres and square metres."""

    static_cloth_penetration_m: float = 0.002
    static_rigid_penetration_m: float = 0.001
    dynamic_cloth_penetration_m: float = 0.003
    persistent_penetration_depth_m: float = 0.001
    maximum_consecutive_dynamic_samples: int = 2
    penetration_patch_depth_m: float = 0.001
    maximum_connected_penetration_patch_area_m2: float = 25.0 * M2_PER_MM2
    attachment_root_gap_m: float = 0.002
    cleaned_seam_or_trim_root_gap_m: float = 0.0005
    proxy_final_one_sided_hausdorff_m: float = 0.005


@dataclass(frozen=True)
class ZoneRequirement:
    """Strongest contract a declared D016 validation zone must satisfy."""

    p05_min_m: float | None = None
    p05_max_m: float | None = None
    p95_min_m: float | None = None
    p95_max_m: float | None = None
    minimum_gap_m: float | None = None
    maximum_gap_m: float | None = None
    maximum_penetration_m: float | None = None
    root_maximum_gap_m: float | None = None
    allowed_targets: tuple[str, ...] = ()


@dataclass(frozen=True)
class D016GraphSpec:
    name: str
    required_layers: tuple[str, ...]
    required_dependencies: Mapping[str, tuple[str, ...]]
    base_layers: tuple[str, ...]
    required_zones: Mapping[str, tuple[str, ...]]
    zone_requirements: Mapping[str, ZoneRequirement]
    required_proxy_links: Mapping[str, tuple[str, ...]] = field(
        default_factory=dict
    )
    required_root_limits_m: Mapping[str, float] = field(default_factory=dict)


DN_M_AFR_01_LAYERS = (
    "00-body",
    "10-base-tunic-sleeves-and-skirt",
    "11-base-trousers",
    "20-front-tabard",
    "30-fitted-waist-belt",
    "31-belt-collision-proxy",
    "32-right-pouch-collision-proxy",
    "33-left-pouch-collision-proxy",
    "40-cowl",
    "50-asymmetric-mantle",
    "60-final-belt-hardware-and-pouches",
    "63-single-right-blue-tassel",
    "64-left-and-right-bracers",
    "70-sandal-soles",
    "71-foot-straps",
    "72-calf-wraps",
    "74-three-strand-necklace-and-disc",
    "80-owner-specific-fringe-border-and-tassel-trim",
)

DN_M_AFR_01_SPEC = D016GraphSpec(
    name="DN-M-AFR-01 D016",
    required_layers=DN_M_AFR_01_LAYERS,
    required_dependencies={
        "10-base-tunic-sleeves-and-skirt": ("00-body",),
        "11-base-trousers": ("00-body",),
        "20-front-tabard": (
            "10-base-tunic-sleeves-and-skirt",
            "11-base-trousers",
        ),
        "30-fitted-waist-belt": (
            "10-base-tunic-sleeves-and-skirt",
            "11-base-trousers",
            "20-front-tabard",
        ),
        "31-belt-collision-proxy": ("30-fitted-waist-belt",),
        "32-right-pouch-collision-proxy": ("30-fitted-waist-belt",),
        "33-left-pouch-collision-proxy": ("30-fitted-waist-belt",),
        "40-cowl": (
            "10-base-tunic-sleeves-and-skirt",
            "11-base-trousers",
            "20-front-tabard",
            "30-fitted-waist-belt",
            "31-belt-collision-proxy",
            "32-right-pouch-collision-proxy",
            "33-left-pouch-collision-proxy",
        ),
        "50-asymmetric-mantle": (
            "40-cowl",
            "30-fitted-waist-belt",
            "31-belt-collision-proxy",
            "32-right-pouch-collision-proxy",
            "33-left-pouch-collision-proxy",
        ),
        "60-final-belt-hardware-and-pouches": (
            "50-asymmetric-mantle",
            "30-fitted-waist-belt",
            "31-belt-collision-proxy",
            "32-right-pouch-collision-proxy",
            "33-left-pouch-collision-proxy",
        ),
        "63-single-right-blue-tassel": (
            "60-final-belt-hardware-and-pouches",
            "30-fitted-waist-belt",
        ),
        "64-left-and-right-bracers": (
            "60-final-belt-hardware-and-pouches",
            "63-single-right-blue-tassel",
            "10-base-tunic-sleeves-and-skirt",
        ),
        "70-sandal-soles": ("64-left-and-right-bracers", "00-body"),
        "71-foot-straps": ("00-body", "70-sandal-soles"),
        "72-calf-wraps": ("11-base-trousers", "71-foot-straps"),
        "74-three-strand-necklace-and-disc": (
            "72-calf-wraps",
            "10-base-tunic-sleeves-and-skirt",
            "40-cowl",
            "50-asymmetric-mantle",
        ),
        "80-owner-specific-fringe-border-and-tassel-trim": (
            "20-front-tabard",
            "50-asymmetric-mantle",
            "63-single-right-blue-tassel",
            "74-three-strand-necklace-and-disc",
        ),
    },
    base_layers=(
        "10-base-tunic-sleeves-and-skirt",
        "11-base-trousers",
    ),
    required_zones={
        "10-base-tunic-sleeves-and-skirt": ("tunic-body",),
        "11-base-trousers": (
            "trousers-waist",
            "trousers-loose-leg",
            "trousers-ankle-taper",
        ),
        "20-front-tabard": ("tabard-upper-root",),
        "30-fitted-waist-belt": ("belt-inward",),
        "31-belt-collision-proxy": ("proxy-anchor",),
        "32-right-pouch-collision-proxy": ("proxy-anchor",),
        "33-left-pouch-collision-proxy": ("proxy-anchor",),
        "40-cowl": ("cowl-support",),
        "50-asymmetric-mantle": (
            "mantle-yoke",
            "mantle-proxy-clearance",
            "mantle-belt-overlap",
        ),
        "60-final-belt-hardware-and-pouches": ("hardware-anchor",),
        "63-single-right-blue-tassel": ("tassel-root",),
        "64-left-and-right-bracers": ("bracer-sleeve",),
        "70-sandal-soles": ("sole-ground", "sole-insole"),
        "71-foot-straps": ("strap-contact", "strap-root"),
        "72-calf-wraps": ("wrap-trouser",),
        "74-three-strand-necklace-and-disc": (
            "necklace-anchor",
            "necklace-rest",
            "pendant-back",
        ),
        "80-owner-specific-fringe-border-and-tassel-trim": ("trim-root",),
    },
    zone_requirements={
        "tunic-body": ZoneRequirement(
            p05_min_m=0.002,
            p95_max_m=0.020,
            allowed_targets=("00-body",),
        ),
        "trousers-waist": ZoneRequirement(
            p95_max_m=0.012, allowed_targets=("00-body",)
        ),
        "trousers-loose-leg": ZoneRequirement(
            p05_min_m=0.003,
            p95_max_m=0.035,
            allowed_targets=("00-body",),
        ),
        "trousers-ankle-taper": ZoneRequirement(
            p95_max_m=0.010, allowed_targets=("00-body",)
        ),
        "tabard-upper-root": ZoneRequirement(
            p95_max_m=0.003,
            maximum_gap_m=0.005,
            allowed_targets=(
                "10-base-tunic-sleeves-and-skirt",
                "11-base-trousers",
                "30-fitted-waist-belt",
            ),
        ),
        "belt-inward": ZoneRequirement(
            p95_max_m=0.003,
            maximum_gap_m=0.005,
            allowed_targets=(
                "10-base-tunic-sleeves-and-skirt",
                "11-base-trousers",
                "20-front-tabard",
            ),
        ),
        "proxy-anchor": ZoneRequirement(
            p95_max_m=0.003,
            maximum_gap_m=0.005,
            allowed_targets=("30-fitted-waist-belt",),
        ),
        "cowl-support": ZoneRequirement(
            p95_min_m=0.002,
            p95_max_m=0.008,
            maximum_gap_m=0.012,
            allowed_targets=(
                "00-body",
                "10-base-tunic-sleeves-and-skirt",
            ),
        ),
        "mantle-yoke": ZoneRequirement(
            p95_min_m=0.002,
            p95_max_m=0.008,
            maximum_gap_m=0.012,
            allowed_targets=("40-cowl", "10-base-tunic-sleeves-and-skirt"),
        ),
        "mantle-proxy-clearance": ZoneRequirement(
            p95_min_m=0.002,
            p95_max_m=0.010,
            maximum_gap_m=0.015,
            allowed_targets=(
                "31-belt-collision-proxy",
                "32-right-pouch-collision-proxy",
                "33-left-pouch-collision-proxy",
            ),
        ),
        "mantle-belt-overlap": ZoneRequirement(
            p05_min_m=0.002,
            p95_max_m=0.008,
            maximum_penetration_m=0.0,
            allowed_targets=("30-fitted-waist-belt",),
        ),
        "hardware-anchor": ZoneRequirement(
            root_maximum_gap_m=0.002,
            allowed_targets=(
                "30-fitted-waist-belt",
                "31-belt-collision-proxy",
                "32-right-pouch-collision-proxy",
                "33-left-pouch-collision-proxy",
            ),
        ),
        "bracer-sleeve": ZoneRequirement(
            p95_max_m=0.003,
            maximum_gap_m=0.005,
            allowed_targets=("10-base-tunic-sleeves-and-skirt",),
        ),
        "sole-ground": ZoneRequirement(
            minimum_gap_m=0.0,
            maximum_gap_m=0.001,
            allowed_targets=("@ground",),
        ),
        "sole-insole": ZoneRequirement(
            p95_max_m=0.003,
            maximum_gap_m=0.005,
            allowed_targets=("00-body",),
        ),
        "strap-contact": ZoneRequirement(
            p95_max_m=0.003,
            maximum_gap_m=0.005,
            allowed_targets=("00-body", "70-sandal-soles"),
        ),
        "strap-root": ZoneRequirement(
            root_maximum_gap_m=0.001,
            allowed_targets=("70-sandal-soles",),
        ),
        "wrap-trouser": ZoneRequirement(
            p95_max_m=0.003,
            maximum_gap_m=0.005,
            allowed_targets=("11-base-trousers",),
        ),
        "tassel-root": ZoneRequirement(
            root_maximum_gap_m=0.002,
            allowed_targets=("30-fitted-waist-belt",),
        ),
        "necklace-anchor": ZoneRequirement(
            root_maximum_gap_m=0.002,
            allowed_targets=(
                "10-base-tunic-sleeves-and-skirt",
                "40-cowl",
                "50-asymmetric-mantle",
            ),
        ),
        "necklace-rest": ZoneRequirement(
            p95_max_m=0.005,
            maximum_gap_m=0.008,
            allowed_targets=(
                "10-base-tunic-sleeves-and-skirt",
                "40-cowl",
                "50-asymmetric-mantle",
            ),
        ),
        "pendant-back": ZoneRequirement(
            p05_min_m=0.001,
            p95_max_m=0.005,
            allowed_targets=(
                "10-base-tunic-sleeves-and-skirt",
                "40-cowl",
                "50-asymmetric-mantle",
            ),
        ),
        "trim-root": ZoneRequirement(
            root_maximum_gap_m=0.0005,
            allowed_targets=(
                "20-front-tabard",
                "50-asymmetric-mantle",
                "63-single-right-blue-tassel",
            ),
        ),
    },
    required_proxy_links={
        "60-final-belt-hardware-and-pouches": (
            "31-belt-collision-proxy",
            "32-right-pouch-collision-proxy",
            "33-left-pouch-collision-proxy",
        )
    },
    required_root_limits_m={
        "40-cowl": 0.003,
        "50-asymmetric-mantle": 0.003,
        "60-final-belt-hardware-and-pouches": 0.002,
        "71-foot-straps": 0.001,
        "63-single-right-blue-tassel": 0.002,
        "74-three-strand-necklace-and-disc": 0.002,
        "80-owner-specific-fringe-border-and-tassel-trim": 0.0005,
    },
)

VALIDATION_PROFILES = ("base", "full")


def required_layers_for_profile(
    spec: D016GraphSpec, profile: str
) -> tuple[str, ...]:
    """Return required logical layers without weakening full acceptance."""

    if profile == "full":
        return spec.required_layers
    if profile == "base":
        return ("00-body", *spec.base_layers)
    raise ValueError(
        f"Unknown validation profile {profile!r}; expected one of {VALIDATION_PROFILES}."
    )


@dataclass
class ValidationIssue:
    code: str
    message: str
    object_name: str | None = None
    layer_id: str | None = None
    target_layer_id: str | None = None
    frame: int | None = None
    evidence: Mapping[str, Any] | None = None
    severity: str = "error"

    def to_json(self) -> dict[str, Any]:
        payload = asdict(self)
        return {key: value for key, value in payload.items() if value is not None}


@dataclass(frozen=True)
class ContactContract:
    zone: str
    target: str
    source_mask: str
    target_mask: str | None = None
    p05_min_m: float | None = None
    p05_max_m: float | None = None
    p95_min_m: float | None = None
    p95_max_m: float | None = None
    minimum_gap_m: float | None = None
    maximum_gap_m: float | None = None
    penetration_limit_m: float | None = None
    root_maximum_gap_m: float | None = None


@dataclass
class DressingItem:
    source: Any
    object_name: str
    layer_id: str
    depends_on: tuple[str, ...]
    collision_targets: tuple[str, ...]
    attachment_target: str | None
    role: str
    item_class: str
    fit_gate_status: str
    contact_contracts: tuple[ContactContract, ...]
    root_group: str | None
    root_indices: tuple[int, ...]
    proxy_layer_id: str | None
    parity_source_mask: str | None
    parity_target_mask: str | None
    metadata_sources: Mapping[str, str]


@dataclass(frozen=True)
class MeshSnapshot:
    object_name: str
    vertices: tuple[tuple[float, float, float], ...]
    faces: tuple[tuple[int, ...], ...]
    masks: Mapping[str, tuple[int, ...]] = field(default_factory=dict)


def percentile(values: Sequence[float], fraction: float) -> float:
    if not values:
        raise ValueError("Cannot calculate a percentile of an empty sequence.")
    ordered = sorted(float(value) for value in values)
    position = max(0.0, min(1.0, fraction)) * (len(ordered) - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    blend = position - lower
    return ordered[lower] * (1.0 - blend) + ordered[upper] * blend


def surface_gap_statistics(signed_gaps: Sequence[float]) -> dict[str, Any]:
    if not signed_gaps:
        raise ValueError("Surface-gap evidence requires at least one sample.")
    values = tuple(float(value) for value in signed_gaps)
    minimum = min(values)
    return {
        "sampleCount": len(values),
        "minimumM": minimum,
        "p05M": percentile(values, 0.05),
        "medianM": percentile(values, 0.50),
        "p95M": percentile(values, 0.95),
        "maximumM": max(values),
        "maximumPenetrationM": max(0.0, -minimum),
        "wrongOrderSampleCount": sum(value < 0.0 for value in values),
    }


def _property(source: Any, aliases: Sequence[str]) -> tuple[bool, Any, str | None]:
    try:
        keys = set(source.keys())
    except (AttributeError, TypeError):
        keys = set(source) if isinstance(source, Mapping) else set()
    for alias in aliases:
        if alias in keys:
            return True, source.get(alias), alias
    return False, None, None


def _explicit_boolean(value: Any, *, label: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().casefold()
        if normalized in ("true", "1", "yes"):
            return True
        if normalized in ("false", "0", "no", ""):
            return False
    raise ValueError(f"{label} must be an explicit boolean.")


def partition_validation_scope(
    sources: Sequence[Any],
    *,
    spec: D016GraphSpec = DN_M_AFR_01_SPEC,
) -> tuple[list[Any], list[dict[str, Any]], list[ValidationIssue]]:
    """Honor narrow helper exclusions without hiding a canonical D016 layer."""

    included: list[Any] = []
    excluded: list[dict[str, Any]] = []
    issues: list[ValidationIssue] = []
    for source in sources:
        object_name = str(
            getattr(source, "name", None) or source.get("name", "<unnamed>")
        )
        found_exclude, exclude_value, _exclude_source = _property(
            source, ("dressingValidationExclude",)
        )
        try:
            should_exclude = (
                _explicit_boolean(
                    exclude_value, label="dressingValidationExclude"
                )
                if found_exclude
                else False
            )
        except ValueError as error:
            issues.append(
                ValidationIssue(
                    code="metadata.validation-exclude.invalid",
                    message=str(error),
                    object_name=object_name,
                )
            )
            included.append(source)
            continue
        if not should_exclude:
            included.append(source)
            continue

        found_layer, layer_value, _layer_source = _property(source, LAYER_ID_KEYS)
        layer_id = str(layer_value).strip() if found_layer else ""
        reason = str(source.get("dressingValidationExcludeReason", "")).strip()
        if not layer_id:
            issues.append(
                ValidationIssue(
                    code="metadata.validation-exclude.layer-id-missing",
                    message=(
                        "Excluded authoring helpers still require an explicit noncanonical "
                        "layerId."
                    ),
                    object_name=object_name,
                )
            )
            continue
        if layer_id in spec.required_layers:
            issues.append(
                ValidationIssue(
                    code="metadata.validation-exclude.required-layer",
                    message=(
                        f"Canonical D016 layer {layer_id} cannot opt out of validation."
                    ),
                    object_name=object_name,
                    layer_id=layer_id,
                )
            )
            continue
        if not reason:
            issues.append(
                ValidationIssue(
                    code="metadata.validation-exclude.reason-missing",
                    message=(
                        "Excluded authoring helpers require "
                        "dressingValidationExcludeReason."
                    ),
                    object_name=object_name,
                    layer_id=layer_id,
                )
            )
            continue
        excluded.append(
            {
                "object": object_name,
                "layerId": layer_id,
                "reason": reason,
            }
        )
    return included, excluded, issues


def _parse_json_value(value: Any, *, label: str) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return json.loads(stripped)
        except json.JSONDecodeError as error:
            raise ValueError(f"{label} is not valid JSON: {error.msg}") from error
    return value


def _parse_string_list(value: Any, *, label: str) -> tuple[str, ...]:
    parsed = _parse_json_value(value, label=label)
    if parsed is None:
        return ()
    if isinstance(parsed, str):
        parsed = [parsed]
    if not isinstance(parsed, (list, tuple)):
        try:
            parsed = list(parsed)
        except TypeError as error:
            raise ValueError(f"{label} must be an array of layer identifiers.") from error
    result = tuple(str(item).strip() for item in parsed)
    if any(not item for item in result):
        raise ValueError(f"{label} contains an empty layer identifier.")
    if len(set(result)) != len(result):
        raise ValueError(f"{label} contains duplicate layer identifiers.")
    return result


def _optional_float(mapping: Mapping[str, Any], *keys: str) -> float | None:
    for key in keys:
        if key in mapping and mapping[key] is not None:
            value = float(mapping[key])
            if not math.isfinite(value):
                raise ValueError(f"{key} must be a finite number.")
            return value
    return None


def _parse_contact_contracts(value: Any) -> tuple[ContactContract, ...]:
    parsed = _parse_json_value(value, label="contactContracts")
    if parsed is None:
        return ()
    if not isinstance(parsed, (list, tuple)):
        raise ValueError("contactContracts must be an array.")
    contracts: list[ContactContract] = []
    for index, raw in enumerate(parsed):
        if not isinstance(raw, Mapping):
            raise ValueError(f"contactContracts[{index}] must be an object.")
        limits_raw = raw.get("limits", raw.get("gap", {}))
        if limits_raw is None:
            limits_raw = {}
        if not isinstance(limits_raw, Mapping):
            raise ValueError(
                f"contactContracts[{index}].limits must be an object."
            )
        combined = dict(limits_raw)
        combined.update(raw)
        zone = str(raw.get("zone", "")).strip()
        target = str(raw.get("target", "")).strip()
        source_mask = str(raw.get("sourceMask", "")).strip()
        if not zone or not target or not source_mask:
            raise ValueError(
                f"contactContracts[{index}] requires zone, target and sourceMask."
            )
        target_mask_raw = raw.get("targetMask")
        target_mask = (
            str(target_mask_raw).strip() if target_mask_raw is not None else None
        )
        if target_mask == "":
            target_mask = None
        contracts.append(
            ContactContract(
                zone=zone,
                target=target,
                source_mask=source_mask,
                target_mask=target_mask,
                p05_min_m=_optional_float(combined, "p05MinM"),
                p05_max_m=_optional_float(combined, "p05MaxM"),
                p95_min_m=_optional_float(combined, "p95MinM"),
                p95_max_m=_optional_float(combined, "p95MaxM"),
                minimum_gap_m=_optional_float(combined, "minimumGapM"),
                maximum_gap_m=_optional_float(combined, "maximumGapM", "maxM"),
                penetration_limit_m=_optional_float(
                    combined, "penetrationLimitM"
                ),
                root_maximum_gap_m=_optional_float(
                    combined, "rootMaximumGapM", "rootMaxGapM"
                ),
            )
        )
    return tuple(contracts)


def normalize_dressing_item(source: Any) -> tuple[DressingItem | None, list[ValidationIssue]]:
    """Normalize Blender ID properties or a mapping into the D016 contract."""

    issues: list[ValidationIssue] = []
    object_name = str(getattr(source, "name", None) or source.get("name", "<unnamed>"))
    found_layer, layer_value, layer_source = _property(source, LAYER_ID_KEYS)
    found_depends, depends_value, depends_source = _property(source, DEPENDS_ON_KEYS)
    found_collision, collision_value, collision_source = _property(
        source, COLLISION_TARGET_KEYS
    )
    found_attachment, attachment_value, attachment_source = _property(
        source, ATTACHMENT_TARGET_KEYS
    )
    found_contracts, contracts_value, contracts_source = _property(
        source, CONTACT_CONTRACT_KEYS
    )
    found_root_group, root_group_value, root_group_source = _property(
        source, ROOT_GROUP_KEYS
    )
    found_root_indices, root_indices_value, root_indices_source = _property(
        source, ROOT_INDICES_KEYS
    )
    found_proxy, proxy_value, proxy_source = _property(source, PROXY_LAYER_KEYS)

    if not found_layer or not str(layer_value).strip():
        issues.append(
            ValidationIssue(
                code="metadata.layer-id.missing",
                message="Dressing objects require layerId/dressingLayerId.",
                object_name=object_name,
            )
        )
        return None, issues
    layer_id = str(layer_value).strip()
    if not found_depends:
        issues.append(
            ValidationIssue(
                code="metadata.depends-on.missing",
                message="Dressing objects require explicit dependsOn metadata.",
                object_name=object_name,
                layer_id=layer_id,
            )
        )
    try:
        depends_on = _parse_string_list(
            depends_value if found_depends else None, label="dependsOn"
        )
        collision_targets = _parse_string_list(
            collision_value if found_collision else None,
            label="collisionTargets",
        )
        contracts = _parse_contact_contracts(
            contracts_value if found_contracts else None
        )
        root_indices_raw = (
            _parse_json_value(root_indices_value, label="attachmentRootVertexIndices")
            if found_root_indices
            else []
        )
        if root_indices_raw is None:
            root_indices_raw = []
        if not isinstance(root_indices_raw, (list, tuple)):
            root_indices_raw = list(root_indices_raw)
        root_indices = tuple(int(value) for value in root_indices_raw)
        if any(value < 0 for value in root_indices):
            raise ValueError("attachmentRootVertexIndices cannot be negative.")
    except (TypeError, ValueError) as error:
        issues.append(
            ValidationIssue(
                code="metadata.invalid",
                message=str(error),
                object_name=object_name,
                layer_id=layer_id,
            )
        )
        return None, issues

    attachment_target = (
        str(attachment_value).strip()
        if found_attachment and attachment_value is not None
        else None
    )
    if attachment_target == "":
        attachment_target = None
    role = str(source.get("dressingRole", source.get("role", ""))).strip()
    item_class = str(
        source.get("dressingItemClass", source.get("itemClass", role))
    ).strip()
    fit_gate_status = str(source.get("fitGateStatus", "")).strip()
    root_group = (
        str(root_group_value).strip()
        if found_root_group and root_group_value is not None
        else None
    )
    if root_group == "":
        root_group = None
    proxy_layer_id = (
        str(proxy_value).strip()
        if found_proxy and proxy_value is not None
        else None
    )
    if proxy_layer_id == "":
        proxy_layer_id = None

    metadata_sources = {
        key: value
        for key, value in {
            "layerId": layer_source,
            "dependsOn": depends_source,
            "collisionTargets": collision_source,
            "attachmentTarget": attachment_source,
            "contactContracts": contracts_source,
            "attachmentRootVertexGroup": root_group_source,
            "attachmentRootVertexIndices": root_indices_source,
            "proxyLayerId": proxy_source,
        }.items()
        if value is not None
    }
    return (
        DressingItem(
            source=source,
            object_name=object_name,
            layer_id=layer_id,
            depends_on=depends_on,
            collision_targets=collision_targets,
            attachment_target=attachment_target,
            role=role,
            item_class=item_class,
            fit_gate_status=fit_gate_status,
            contact_contracts=contracts,
            root_group=root_group,
            root_indices=root_indices,
            proxy_layer_id=proxy_layer_id,
            parity_source_mask=(
                str(source.get("proxyParitySourceVertexGroup", "")).strip() or None
            ),
            parity_target_mask=(
                str(source.get("proxyParityTargetVertexGroup", "")).strip() or None
            ),
            metadata_sources=metadata_sources,
        ),
        issues,
    )


def _numeric_layer_order(layer_id: str) -> int | None:
    match = re.match(r"^(\d+)", layer_id)
    return int(match.group(1)) if match else None


def _status_is_provisional(value: str) -> bool:
    lowered = value.casefold()
    return any(
        token in lowered
        for token in ("provisional", "smoke", "pending", "rejected", "failed")
    )


def _status_is_accepted(value: str) -> bool:
    lowered = value.casefold()
    return bool(lowered) and not _status_is_provisional(lowered) and any(
        token in lowered
        for token in ("accepted", "approved", "passed", "production")
    )


def _contract_strength_issues(
    contract: ContactContract,
    requirement: ZoneRequirement,
    *,
    item: DressingItem,
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    if requirement.allowed_targets and contract.target not in requirement.allowed_targets:
        issues.append(
            ValidationIssue(
                code="contract.target.invalid",
                message=(
                    f"Zone {contract.zone} targets {contract.target}; allowed targets are "
                    f"{list(requirement.allowed_targets)}."
                ),
                object_name=item.object_name,
                layer_id=item.layer_id,
                target_layer_id=contract.target,
            )
        )
    checks = (
        ("p05MinM", contract.p05_min_m, requirement.p05_min_m, "at-least"),
        ("p05MaxM", contract.p05_max_m, requirement.p05_max_m, "at-most"),
        ("p95MinM", contract.p95_min_m, requirement.p95_min_m, "at-least"),
        ("p95MaxM", contract.p95_max_m, requirement.p95_max_m, "at-most"),
        (
            "minimumGapM",
            contract.minimum_gap_m,
            requirement.minimum_gap_m,
            "at-least",
        ),
        (
            "maximumGapM",
            contract.maximum_gap_m,
            requirement.maximum_gap_m,
            "at-most",
        ),
        (
            "penetrationLimitM",
            contract.penetration_limit_m,
            requirement.maximum_penetration_m,
            "at-most",
        ),
        (
            "rootMaximumGapM",
            contract.root_maximum_gap_m,
            requirement.root_maximum_gap_m,
            "at-most",
        ),
    )
    for label, declared, required, direction in checks:
        if required is None:
            continue
        strong_enough = declared is not None and (
            declared >= required if direction == "at-least" else declared <= required
        )
        if not strong_enough:
            issues.append(
                ValidationIssue(
                    code="contract.threshold.missing-or-loose",
                    message=(
                        f"Zone {contract.zone} requires {label} {direction} "
                        f"{required:.6f} m; declared value is {declared!r}."
                    ),
                    object_name=item.object_name,
                    layer_id=item.layer_id,
                    target_layer_id=contract.target,
                )
            )
    return issues


def validate_metadata_graph(
    items: Sequence[DressingItem],
    *,
    spec: D016GraphSpec = DN_M_AFR_01_SPEC,
    require_geometry_contracts: bool = True,
    required_layers: Sequence[str] | None = None,
) -> tuple[dict[str, Any], list[ValidationIssue]]:
    """Validate the D016 DAG and fail closed on unaccepted base layers."""

    issues: list[ValidationIssue] = []
    by_layer: dict[str, list[DressingItem]] = {}
    for item in items:
        by_layer.setdefault(item.layer_id, []).append(item)

    active_required_layers = tuple(required_layers or spec.required_layers)
    for layer_id in active_required_layers:
        if layer_id not in by_layer:
            issues.append(
                ValidationIssue(
                    code="graph.required-layer.missing",
                    message=f"Required D016 layer {layer_id} is missing.",
                    layer_id=layer_id,
                )
            )

    graph_dependencies: dict[str, set[str]] = {}
    for layer_id, layer_items in sorted(by_layer.items()):
        dependency_sets = {item.depends_on for item in layer_items}
        if len(dependency_sets) > 1:
            issues.append(
                ValidationIssue(
                    code="graph.layer-dependencies.inconsistent",
                    message=(
                        f"Objects sharing layer {layer_id} declare different dependsOn sets."
                    ),
                    layer_id=layer_id,
                    evidence={
                        item.object_name: list(item.depends_on) for item in layer_items
                    },
                )
            )
        graph_dependencies[layer_id] = set().union(
            *(set(item.depends_on) for item in layer_items)
        )
        for item in layer_items:
            if layer_id != "00-body" and not (
                item.collision_targets or item.attachment_target
            ):
                issues.append(
                    ValidationIssue(
                        code="metadata.physical-target.missing",
                        message=(
                            "Every garment or accessory requires collisionTargets or "
                            "attachmentTarget."
                        ),
                        object_name=item.object_name,
                        layer_id=layer_id,
                    )
                )
            if (
                require_geometry_contracts
                and layer_id != "00-body"
                and not item.contact_contracts
            ):
                issues.append(
                    ValidationIssue(
                        code="contract.object-evidence.missing",
                        message=(
                            "Every garment and accessory object requires at least one "
                            "distributed contact contract."
                        ),
                        object_name=item.object_name,
                        layer_id=layer_id,
                    )
                )
            if layer_id in spec.required_root_limits_m:
                if not item.attachment_target:
                    issues.append(
                        ValidationIssue(
                            code="metadata.attachment-target.required",
                            message=(
                                f"Layer {layer_id} requires a named attachmentTarget "
                                "for its D016 root gate."
                            ),
                            object_name=item.object_name,
                            layer_id=layer_id,
                        )
                    )
                if not item.root_group and not item.root_indices:
                    issues.append(
                        ValidationIssue(
                            code="metadata.attachment-root.required",
                            message=(
                                f"Layer {layer_id} requires a named attachment root "
                                "vertex group or explicit evaluated root indices."
                            ),
                            object_name=item.object_name,
                            layer_id=layer_id,
                        )
                    )
            for target in item.collision_targets:
                if target not in item.depends_on:
                    issues.append(
                        ValidationIssue(
                            code="graph.collision-target.not-dependency",
                            message=(
                                f"Collision target {target} is not declared in dependsOn."
                            ),
                            object_name=item.object_name,
                            layer_id=layer_id,
                            target_layer_id=target,
                        )
                    )
            if item.attachment_target and item.attachment_target not in item.depends_on:
                issues.append(
                    ValidationIssue(
                        code="graph.attachment-target.not-dependency",
                        message=(
                            f"Attachment target {item.attachment_target} is not declared "
                            "in dependsOn."
                        ),
                        object_name=item.object_name,
                        layer_id=layer_id,
                        target_layer_id=item.attachment_target,
                    )
                )

            if _status_is_provisional(item.fit_gate_status):
                issues.append(
                    ValidationIssue(
                        code="gate.provisional-item",
                        message=(
                            f"Layer status {item.fit_gate_status!r} is not acceptable for "
                            "a production dressing-stack pass."
                        ),
                        object_name=item.object_name,
                        layer_id=layer_id,
                    )
                )
            elif not _status_is_accepted(item.fit_gate_status):
                issues.append(
                    ValidationIssue(
                        code=(
                            "gate.base-layer.not-accepted"
                            if layer_id in spec.base_layers
                            else "gate.item.not-accepted"
                        ),
                        message=(
                            "Dressing items fail closed unless fitGateStatus explicitly "
                            "records an accepted, approved, passed or production state."
                        ),
                        object_name=item.object_name,
                        layer_id=layer_id,
                    )
                )
            if layer_id in spec.base_layers and not bool(
                item.source.get("baseFitAccepted", False)
            ):
                issues.append(
                    ValidationIssue(
                        code="gate.base-fit-evidence.missing",
                        message="Base garments require baseFitAccepted=true.",
                        object_name=item.object_name,
                        layer_id=layer_id,
                    )
                )

    for layer_id, dependencies in sorted(graph_dependencies.items()):
        layer_order = _numeric_layer_order(layer_id)
        for dependency in sorted(dependencies):
            if dependency == layer_id:
                issues.append(
                    ValidationIssue(
                        code="graph.self-dependency",
                        message=f"Layer {layer_id} depends on itself.",
                        layer_id=layer_id,
                    )
                )
                continue
            if dependency not in by_layer:
                issues.append(
                    ValidationIssue(
                        code="graph.dependency.missing",
                        message=f"Dependency {dependency} has no dressing layer.",
                        layer_id=layer_id,
                        target_layer_id=dependency,
                    )
                )
                continue
            dependency_order = _numeric_layer_order(dependency)
            if (
                layer_order is not None
                and dependency_order is not None
                and dependency_order >= layer_order
            ):
                issues.append(
                    ValidationIssue(
                        code="graph.dependency.order",
                        message=(
                            f"Dependency {dependency} does not precede layer {layer_id}."
                        ),
                        layer_id=layer_id,
                        target_layer_id=dependency,
                    )
                )

    # Kahn's algorithm catches cycles even when layer identifiers lack numbers.
    existing_dependencies = {
        layer: {dep for dep in deps if dep in graph_dependencies}
        for layer, deps in graph_dependencies.items()
    }
    ready = sorted(layer for layer, deps in existing_dependencies.items() if not deps)
    visited: list[str] = []
    while ready:
        layer = ready.pop(0)
        visited.append(layer)
        for candidate, deps in existing_dependencies.items():
            if layer in deps:
                deps.remove(layer)
                if not deps and candidate not in visited and candidate not in ready:
                    ready.append(candidate)
                    ready.sort()
    cyclic = sorted(set(existing_dependencies) - set(visited))
    if cyclic:
        issues.append(
            ValidationIssue(
                code="graph.cycle",
                message=f"Dressing dependency graph contains a cycle: {cyclic}.",
                evidence={"layers": cyclic},
            )
        )

    for layer_id, required in spec.required_dependencies.items():
        if layer_id not in by_layer:
            continue
        missing = sorted(set(required) - graph_dependencies.get(layer_id, set()))
        if missing:
            issues.append(
                ValidationIssue(
                    code="graph.binding-dependency.missing",
                    message=(
                        f"Layer {layer_id} omits binding D016 dependencies {missing}."
                    ),
                    layer_id=layer_id,
                    evidence={"missing": missing},
                )
            )

    declared_zones: dict[str, set[str]] = {}
    for item in items:
        for contract in item.contact_contracts:
            declared_zones.setdefault(item.layer_id, set()).add(contract.zone)
            allowed_layer_zones = set(spec.required_zones.get(item.layer_id, ()))
            if allowed_layer_zones and contract.zone not in allowed_layer_zones:
                issues.append(
                    ValidationIssue(
                        code="contract.zone.invalid-for-layer",
                        message=(
                            f"Zone {contract.zone} is not valid for layer {item.layer_id}; "
                            f"allowed zones are {sorted(allowed_layer_zones)}."
                        ),
                        object_name=item.object_name,
                        layer_id=item.layer_id,
                        target_layer_id=contract.target,
                    )
                )
            requirement = spec.zone_requirements.get(contract.zone)
            if requirement is None:
                issues.append(
                    ValidationIssue(
                        code="contract.zone.unknown",
                        message=f"Unknown D016 contact zone {contract.zone}.",
                        object_name=item.object_name,
                        layer_id=item.layer_id,
                        target_layer_id=contract.target,
                    )
                )
            else:
                issues.extend(
                    _contract_strength_issues(contract, requirement, item=item)
                )
            if contract.target != "@ground" and contract.target not in (
                *item.collision_targets,
                item.attachment_target,
            ):
                issues.append(
                    ValidationIssue(
                        code="contract.target.undeclared",
                        message=(
                            f"Contact zone {contract.zone} targets {contract.target}, but "
                            "that target is absent from collisionTargets/attachmentTarget."
                        ),
                        object_name=item.object_name,
                        layer_id=item.layer_id,
                        target_layer_id=contract.target,
                    )
                )

    if require_geometry_contracts:
        for layer_id, required in spec.required_zones.items():
            if layer_id not in by_layer:
                continue
            missing = sorted(set(required) - declared_zones.get(layer_id, set()))
            if missing:
                issues.append(
                    ValidationIssue(
                        code="contract.required-zone.missing",
                        message=f"Layer {layer_id} lacks D016 zones {missing}.",
                        layer_id=layer_id,
                        evidence={"missing": missing},
                    )
                )

    for layer_id, required_proxies in spec.required_proxy_links.items():
        layer_items = by_layer.get(layer_id, [])
        if not layer_items:
            continue
        linked = {item.proxy_layer_id for item in layer_items if item.proxy_layer_id}
        missing = sorted(set(required_proxies) - linked)
        if missing:
            issues.append(
                ValidationIssue(
                    code="proxy.required-link.missing",
                    message=f"Layer {layer_id} lacks proxy parity links {missing}.",
                    layer_id=layer_id,
                    evidence={"missing": missing},
                )
            )

    graph_report = {
        "spec": spec.name,
        "requiredLayers": list(active_required_layers),
        "layers": {
            layer_id: {
                "objects": [item.object_name for item in layer_items],
                "dependsOn": sorted(graph_dependencies.get(layer_id, set())),
                "collisionTargets": sorted(
                    {
                        target
                        for item in layer_items
                        for target in item.collision_targets
                    }
                ),
                "attachmentTargets": sorted(
                    {
                        item.attachment_target
                        for item in layer_items
                        if item.attachment_target
                    }
                ),
                "zones": sorted(declared_zones.get(layer_id, set())),
                "fitGateStatuses": sorted(
                    {item.fit_gate_status for item in layer_items}
                ),
            }
            for layer_id, layer_items in sorted(by_layer.items())
        },
        "topologicalOrder": visited,
        "accepted": not issues,
    }
    return graph_report, issues


def _subtract(
    first: tuple[float, float, float], second: tuple[float, float, float]
) -> tuple[float, float, float]:
    return (
        first[0] - second[0],
        first[1] - second[1],
        first[2] - second[2],
    )


def _add(
    first: tuple[float, float, float], second: tuple[float, float, float]
) -> tuple[float, float, float]:
    return (
        first[0] + second[0],
        first[1] + second[1],
        first[2] + second[2],
    )


def _scale(
    value: tuple[float, float, float], scalar: float
) -> tuple[float, float, float]:
    return value[0] * scalar, value[1] * scalar, value[2] * scalar


def _cross(
    first: tuple[float, float, float], second: tuple[float, float, float]
) -> tuple[float, float, float]:
    return (
        first[1] * second[2] - first[2] * second[1],
        first[2] * second[0] - first[0] * second[2],
        first[0] * second[1] - first[1] * second[0],
    )


def _length(value: tuple[float, float, float]) -> float:
    return math.sqrt(value[0] ** 2 + value[1] ** 2 + value[2] ** 2)


def _distance(
    first: tuple[float, float, float], second: tuple[float, float, float]
) -> float:
    return _length(_subtract(first, second))


def _triangle_area(
    first: tuple[float, float, float],
    second: tuple[float, float, float],
    third: tuple[float, float, float],
) -> float:
    return 0.5 * _length(_cross(_subtract(second, first), _subtract(third, first)))


def _triangles(faces: Sequence[Sequence[int]]) -> Iterable[tuple[int, int, int]]:
    for face in faces:
        if len(face) < 3:
            continue
        for index in range(1, len(face) - 1):
            yield int(face[0]), int(face[index]), int(face[index + 1])


def _clipped_triangle_area(
    points: Sequence[tuple[float, float, float]],
    signed_distances: Sequence[float],
    *,
    penetration_depth_m: float,
) -> float:
    """Area where the linearly interpolated surface is deeper than the limit."""

    polygon = [
        (point, float(distance) + penetration_depth_m)
        for point, distance in zip(points, signed_distances)
    ]
    clipped: list[tuple[tuple[float, float, float], float]] = []
    for current_index, current in enumerate(polygon):
        previous = polygon[current_index - 1]
        previous_inside = previous[1] < 0.0
        current_inside = current[1] < 0.0
        if previous_inside != current_inside:
            denominator = previous[1] - current[1]
            amount = previous[1] / denominator if abs(denominator) > 1.0e-15 else 0.0
            point = _add(
                previous[0], _scale(_subtract(current[0], previous[0]), amount)
            )
            clipped.append((point, 0.0))
        if current_inside:
            clipped.append(current)
    if len(clipped) < 3:
        return 0.0
    anchor = clipped[0][0]
    return sum(
        _triangle_area(anchor, clipped[index][0], clipped[index + 1][0])
        for index in range(1, len(clipped) - 1)
    )


def connected_penetration_patch_metrics(
    snapshot: MeshSnapshot,
    signed_distances: Sequence[float],
    *,
    penetration_depth_m: float,
) -> dict[str, Any]:
    """Measure edge-connected penetrated surface patches conservatively.

    Each polygon is triangulated as a fan.  Triangle area is clipped at the
    requested signed depth rather than counting a whole face because a single
    deep corner should not fabricate a large patch.  Clipped triangles join
    only across an edge whose linear distance field also crosses the deep
    region.
    """

    if len(signed_distances) != len(snapshot.vertices):
        raise ValueError("Signed-distance count does not match snapshot vertices.")
    triangle_records: list[dict[str, Any]] = []
    for indices in _triangles(snapshot.faces):
        points = [snapshot.vertices[index] for index in indices]
        distances = [float(signed_distances[index]) for index in indices]
        clipped_area = _clipped_triangle_area(
            points,
            distances,
            penetration_depth_m=penetration_depth_m,
        )
        if clipped_area <= 1.0e-16:
            continue
        deep_edges = {
            tuple(sorted((indices[first], indices[second])))
            for first, second in ((0, 1), (1, 2), (2, 0))
            if min(distances[first], distances[second]) < -penetration_depth_m
        }
        triangle_records.append(
            {"indices": indices, "area": clipped_area, "deepEdges": deep_edges}
        )

    parents = list(range(len(triangle_records)))

    def find(index: int) -> int:
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    def union(first: int, second: int) -> None:
        first_root = find(first)
        second_root = find(second)
        if first_root != second_root:
            parents[second_root] = first_root

    edge_owners: dict[tuple[int, int], int] = {}
    for index, record in enumerate(triangle_records):
        for edge in record["deepEdges"]:
            owner = edge_owners.get(edge)
            if owner is None:
                edge_owners[edge] = index
            else:
                union(owner, index)

    component_areas: dict[int, float] = {}
    for index, record in enumerate(triangle_records):
        root = find(index)
        component_areas[root] = component_areas.get(root, 0.0) + float(
            record["area"]
        )
    areas = sorted(component_areas.values(), reverse=True)
    return {
        "depthThresholdM": penetration_depth_m,
        "patchCount": len(areas),
        "totalAreaM2": sum(areas),
        "maximumConnectedAreaM2": areas[0] if areas else 0.0,
        "areasM2": areas,
    }


def _snapshot_for_mask(
    snapshot: MeshSnapshot, mask_name: str | None
) -> MeshSnapshot:
    if not mask_name or mask_name == "*":
        return snapshot
    indices = set(snapshot.masks.get(mask_name, ()))
    if not indices:
        raise ValueError(
            f"Evaluated mesh {snapshot.object_name} has no non-empty mask {mask_name!r}."
        )
    faces = tuple(face for face in snapshot.faces if any(index in indices for index in face))
    if not faces:
        raise ValueError(
            f"Mask {mask_name!r} selects no faces on {snapshot.object_name}."
        )
    return MeshSnapshot(
        object_name=snapshot.object_name,
        vertices=snapshot.vertices,
        faces=faces,
        masks=snapshot.masks,
    )


def _combine_snapshots(
    snapshots: Sequence[MeshSnapshot], *, name: str, mask_name: str | None = None
) -> MeshSnapshot:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for original in snapshots:
        snapshot = _snapshot_for_mask(original, mask_name)
        offset = len(vertices)
        vertices.extend(snapshot.vertices)
        faces.extend(tuple(index + offset for index in face) for face in snapshot.faces)
    if not vertices or not faces:
        raise ValueError(f"Combined surface {name} has no evaluated mesh faces.")
    return MeshSnapshot(name, tuple(vertices), tuple(faces), {})


def _snapshot_vertex_indices(snapshot: MeshSnapshot, mask_name: str) -> tuple[int, ...]:
    if mask_name == "*":
        return tuple(range(len(snapshot.vertices)))
    indices = snapshot.masks.get(mask_name, ())
    if not indices:
        raise ValueError(
            f"Evaluated mesh {snapshot.object_name} has no non-empty mask {mask_name!r}."
        )
    return indices


def _require_blender() -> None:
    if bpy is None or Vector is None or BVHTree is None:
        raise RuntimeError(
            "Blender geometry validation requires execution inside Blender 5.2."
        )


def evaluated_mesh_snapshot(
    obj: Any,
    depsgraph: Any,
    *,
    requested_masks: Iterable[str] = (),
) -> MeshSnapshot:
    """Copy an object's evaluated world-space mesh without mutating the scene."""

    _require_blender()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    if mesh is None:
        raise RuntimeError(f"Unable to evaluate mesh for {obj.name}.")
    try:
        matrix_world = evaluated.matrix_world
        vertices = tuple(
            tuple(float(component) for component in (matrix_world @ vertex.co))
            for vertex in mesh.vertices
        )
        faces = tuple(tuple(int(index) for index in polygon.vertices) for polygon in mesh.polygons)
        masks: dict[str, tuple[int, ...]] = {}
        for name in sorted(set(requested_masks) - {"*", ""}):
            group = evaluated.vertex_groups.get(name)
            if group is None:
                masks[name] = ()
                continue
            selected: list[int] = []
            for vertex in mesh.vertices:
                if any(
                    membership.group == group.index and membership.weight >= 0.5
                    for membership in vertex.groups
                ):
                    selected.append(int(vertex.index))
            masks[name] = tuple(selected)
        return MeshSnapshot(str(obj.name), vertices, faces, masks)
    finally:
        evaluated.to_mesh_clear()


class _BlenderSurfaceQuery:
    def __init__(self, snapshot: MeshSnapshot):
        _require_blender()
        self.snapshot = snapshot
        self.tree = BVHTree.FromPolygons(
            [Vector(vertex) for vertex in snapshot.vertices],
            [list(face) for face in snapshot.faces],
            all_triangles=False,
        )

    def distances(
        self, points: Sequence[tuple[float, float, float]]
    ) -> tuple[list[float], list[float]]:
        signed: list[float] = []
        unsigned: list[float] = []
        for point in points:
            nearest = self.tree.find_nearest(Vector(point))
            if nearest is None or nearest[0] is None or nearest[1] is None:
                raise RuntimeError(
                    f"Unable to query evaluated surface {self.snapshot.object_name}."
                )
            location, normal, _polygon_index, distance = nearest
            normal_length = float(normal.length)
            if normal_length <= 1.0e-12:
                raise RuntimeError(
                    f"Degenerate surface normal on {self.snapshot.object_name}."
                )
            delta = Vector(point) - location
            signed.append(float(delta.dot(normal / normal_length)))
            unsigned.append(float(distance))
        return signed, unsigned


def _is_soft_cloth(item: DressingItem) -> bool:
    text = " ".join(
        (
            item.layer_id,
            item.role,
            item.item_class,
            str(item.source.get("construction", "")),
        )
    ).casefold()
    return any(
        token in text
        for token in ("tunic", "trouser", "tabard", "cowl", "mantle", "cloth")
    )


def _root_gap_limit(item: DressingItem, thresholds: ValidationThresholds) -> float:
    if item.layer_id == "71-foot-straps":
        return 0.001
    if item.layer_id in ("40-cowl", "50-asymmetric-mantle"):
        return 0.003
    if item.layer_id == "80-owner-specific-fringe-border-and-tassel-trim":
        return thresholds.cleaned_seam_or_trim_root_gap_m
    return thresholds.attachment_root_gap_m


def _contact_gate_failures(
    contract: ContactContract,
    signed_stats: Mapping[str, Any],
    unsigned_stats: Mapping[str, Any],
) -> list[tuple[str, str, Mapping[str, Any]]]:
    checks = (
        ("p05-min", contract.p05_min_m, signed_stats["p05M"], "minimum"),
        ("p05-max", contract.p05_max_m, signed_stats["p05M"], "maximum"),
        ("p95-min", contract.p95_min_m, signed_stats["p95M"], "minimum"),
        ("p95-max", contract.p95_max_m, signed_stats["p95M"], "maximum"),
        (
            "minimum-gap",
            contract.minimum_gap_m,
            signed_stats["minimumM"],
            "minimum",
        ),
        (
            "maximum-gap",
            contract.maximum_gap_m,
            signed_stats["maximumM"],
            "maximum",
        ),
        (
            "penetration",
            contract.penetration_limit_m,
            signed_stats["maximumPenetrationM"],
            "maximum",
        ),
        (
            "root-gap",
            contract.root_maximum_gap_m,
            unsigned_stats["maximumM"],
            "maximum",
        ),
    )
    failures: list[tuple[str, str, Mapping[str, Any]]] = []
    for label, threshold, observed, kind in checks:
        if threshold is None:
            continue
        passed = observed >= threshold if kind == "minimum" else observed <= threshold
        if not passed:
            failures.append(
                (
                    label,
                    (
                        f"{contract.zone} {label} observed {observed:.6f} m; "
                        f"required {kind} {threshold:.6f} m."
                    ),
                    {"observedM": observed, "thresholdM": threshold},
                )
            )
    return failures


def _aabb_metrics(snapshot: MeshSnapshot) -> dict[str, Any]:
    axes = list(zip(*snapshot.vertices))
    minimum = tuple(min(axis) for axis in axes)
    maximum = tuple(max(axis) for axis in axes)
    extents = tuple(maximum[index] - minimum[index] for index in range(3))
    centroid = tuple(
        sum(vertex[index] for vertex in snapshot.vertices) / len(snapshot.vertices)
        for index in range(3)
    )
    return {"minimum": minimum, "maximum": maximum, "extents": extents, "centroid": centroid}


def _target_snapshots(
    target: str,
    *,
    by_layer: Mapping[str, Sequence[DressingItem]],
    snapshots: Mapping[int, MeshSnapshot],
    support_surfaces: Mapping[str, Sequence[Any]],
    support_snapshots: Mapping[int, MeshSnapshot],
) -> list[MeshSnapshot]:
    if target.startswith("@"):
        return [
            support_snapshots[id(obj)]
            for obj in support_surfaces.get(target, ())
            if id(obj) in support_snapshots
        ]
    return [
        snapshots[id(item.source)]
        for item in by_layer.get(target, ())
        if id(item.source) in snapshots
    ]


def validate_geometry_frame(
    items: Sequence[DressingItem],
    *,
    depsgraph: Any,
    frame: int,
    dynamic: bool,
    thresholds: ValidationThresholds,
    support_surfaces: Mapping[str, Sequence[Any]] | None = None,
) -> tuple[dict[str, Any], list[ValidationIssue]]:
    """Run evaluated-mesh contact, penetration, root and proxy gates."""

    _require_blender()
    support_surfaces = support_surfaces or {}
    issues: list[ValidationIssue] = []
    by_layer: dict[str, list[DressingItem]] = {}
    for item in items:
        by_layer.setdefault(item.layer_id, []).append(item)

    requested_masks: dict[int, set[str]] = {id(item.source): set() for item in items}
    support_masks: dict[int, set[str]] = {
        id(obj): set() for objects in support_surfaces.values() for obj in objects
    }
    for item in items:
        if item.root_group:
            requested_masks[id(item.source)].add(item.root_group)
        if item.parity_target_mask:
            requested_masks[id(item.source)].add(item.parity_target_mask)
        if item.parity_source_mask:
            requested_masks[id(item.source)].add(item.parity_source_mask)
        for contract in item.contact_contracts:
            requested_masks[id(item.source)].add(contract.source_mask)
            target_items = by_layer.get(contract.target, ())
            if contract.target.startswith("@"):
                for target_object in support_surfaces.get(contract.target, ()):
                    if contract.target_mask:
                        support_masks[id(target_object)].add(contract.target_mask)
            else:
                for target_item in target_items:
                    if contract.target_mask:
                        requested_masks[id(target_item.source)].add(contract.target_mask)

    snapshots: dict[int, MeshSnapshot] = {}
    for item in items:
        try:
            snapshots[id(item.source)] = evaluated_mesh_snapshot(
                item.source,
                depsgraph,
                requested_masks=requested_masks[id(item.source)],
            )
        except (RuntimeError, ValueError) as error:
            issues.append(
                ValidationIssue(
                    code="geometry.evaluated-mesh.failed",
                    message=str(error),
                    object_name=item.object_name,
                    layer_id=item.layer_id,
                    frame=frame,
                )
            )
    support_snapshots: dict[int, MeshSnapshot] = {}
    for target, objects in support_surfaces.items():
        for obj in objects:
            try:
                support_snapshots[id(obj)] = evaluated_mesh_snapshot(
                    obj,
                    depsgraph,
                    requested_masks=support_masks[id(obj)],
                )
            except (RuntimeError, ValueError) as error:
                issues.append(
                    ValidationIssue(
                        code="geometry.support-surface.failed",
                        message=str(error),
                        object_name=str(obj.name),
                        target_layer_id=target,
                        frame=frame,
                    )
                )

    target_query_cache: dict[tuple[str, str | None], _BlenderSurfaceQuery] = {}

    def target_query(target: str, mask: str | None = None) -> _BlenderSurfaceQuery:
        cache_key = (target, mask)
        if cache_key not in target_query_cache:
            target_parts = _target_snapshots(
                target,
                by_layer=by_layer,
                snapshots=snapshots,
                support_surfaces=support_surfaces,
                support_snapshots=support_snapshots,
            )
            if not target_parts:
                raise ValueError(f"Target {target} has no evaluated mesh surfaces.")
            combined = _combine_snapshots(
                target_parts, name=f"{target}:{mask or '*'}", mask_name=mask
            )
            target_query_cache[cache_key] = _BlenderSurfaceQuery(combined)
        return target_query_cache[cache_key]

    relations: list[dict[str, Any]] = []
    contracts_report: list[dict[str, Any]] = []
    roots_report: list[dict[str, Any]] = []
    parity_report: list[dict[str, Any]] = []

    for item in items:
        source_snapshot = snapshots.get(id(item.source))
        if source_snapshot is None:
            continue
        physical_targets = list(item.collision_targets)
        if item.attachment_target and item.attachment_target not in physical_targets:
            physical_targets.append(item.attachment_target)
        for target in physical_targets:
            try:
                query = target_query(target)
                signed, unsigned = query.distances(source_snapshot.vertices)
                signed_stats = surface_gap_statistics(signed)
                patch_metrics = connected_penetration_patch_metrics(
                    source_snapshot,
                    signed,
                    penetration_depth_m=thresholds.penetration_patch_depth_m,
                )
                penetration_limit = (
                    thresholds.dynamic_cloth_penetration_m
                    if dynamic and _is_soft_cloth(item)
                    else (
                        thresholds.static_cloth_penetration_m
                        if _is_soft_cloth(item)
                        else thresholds.static_rigid_penetration_m
                    )
                )
                relation = {
                    "object": item.object_name,
                    "layerId": item.layer_id,
                    "target": target,
                    "kind": "cloth" if _is_soft_cloth(item) else "rigid",
                    "signedGapM": signed_stats,
                    "unsignedGapM": surface_gap_statistics(unsigned),
                    "connectedPenetrationPatches": patch_metrics,
                    "penetrationLimitM": penetration_limit,
                    "accepted": (
                        signed_stats["maximumPenetrationM"] <= penetration_limit
                        and patch_metrics["maximumConnectedAreaM2"]
                        <= thresholds.maximum_connected_penetration_patch_area_m2
                    ),
                }
                relations.append(relation)
                if signed_stats["maximumPenetrationM"] > penetration_limit:
                    issues.append(
                        ValidationIssue(
                            code="geometry.penetration.limit",
                            message=(
                                f"Maximum penetration {signed_stats['maximumPenetrationM']:.6f} m "
                                f"exceeds {penetration_limit:.6f} m."
                            ),
                            object_name=item.object_name,
                            layer_id=item.layer_id,
                            target_layer_id=target,
                            frame=frame,
                            evidence={
                                "maximumPenetrationM": signed_stats[
                                    "maximumPenetrationM"
                                ],
                                "limitM": penetration_limit,
                            },
                        )
                    )
                if (
                    patch_metrics["maximumConnectedAreaM2"]
                    > thresholds.maximum_connected_penetration_patch_area_m2
                ):
                    issues.append(
                        ValidationIssue(
                            code="geometry.penetration.connected-patch",
                            message=(
                                "Connected penetration patch area "
                                f"{patch_metrics['maximumConnectedAreaM2']:.9f} m2 exceeds "
                                f"{thresholds.maximum_connected_penetration_patch_area_m2:.9f} m2."
                            ),
                            object_name=item.object_name,
                            layer_id=item.layer_id,
                            target_layer_id=target,
                            frame=frame,
                            evidence=patch_metrics,
                        )
                    )
            except (RuntimeError, ValueError) as error:
                issues.append(
                    ValidationIssue(
                        code="geometry.relation.failed",
                        message=str(error),
                        object_name=item.object_name,
                        layer_id=item.layer_id,
                        target_layer_id=target,
                        frame=frame,
                    )
                )

        for contract in item.contact_contracts:
            try:
                query = target_query(contract.target, contract.target_mask)
                indices = _snapshot_vertex_indices(
                    source_snapshot, contract.source_mask
                )
                points = [source_snapshot.vertices[index] for index in indices]
                signed, unsigned = query.distances(points)
                signed_stats = surface_gap_statistics(signed)
                unsigned_stats = surface_gap_statistics(unsigned)
                failures = _contact_gate_failures(
                    contract, signed_stats, unsigned_stats
                )
                contracts_report.append(
                    {
                        "object": item.object_name,
                        "layerId": item.layer_id,
                        "zone": contract.zone,
                        "target": contract.target,
                        "sourceMask": contract.source_mask,
                        "targetMask": contract.target_mask,
                        "signedGapM": signed_stats,
                        "unsignedGapM": unsigned_stats,
                        "accepted": not failures,
                    }
                )
                for label, message, evidence in failures:
                    issues.append(
                        ValidationIssue(
                            code=f"geometry.contact.{label}",
                            message=message,
                            object_name=item.object_name,
                            layer_id=item.layer_id,
                            target_layer_id=contract.target,
                            frame=frame,
                            evidence=evidence,
                        )
                    )
            except (RuntimeError, ValueError, IndexError) as error:
                issues.append(
                    ValidationIssue(
                        code="geometry.contact.failed",
                        message=str(error),
                        object_name=item.object_name,
                        layer_id=item.layer_id,
                        target_layer_id=contract.target,
                        frame=frame,
                        evidence={"zone": contract.zone},
                    )
                )

        if item.attachment_target:
            try:
                if item.root_group:
                    root_indices = _snapshot_vertex_indices(
                        source_snapshot, item.root_group
                    )
                elif item.root_indices:
                    root_indices = item.root_indices
                    if max(root_indices, default=-1) >= len(source_snapshot.vertices):
                        raise ValueError(
                            "attachmentRootVertexIndices exceed the evaluated mesh."
                        )
                else:
                    raise ValueError(
                        "attachmentTarget requires attachmentRootVertexGroup or "
                        "attachmentRootVertexIndicesJson."
                    )
                query = target_query(item.attachment_target)
                points = [source_snapshot.vertices[index] for index in root_indices]
                _signed, unsigned = query.distances(points)
                stats = surface_gap_statistics(unsigned)
                limit = _root_gap_limit(item, thresholds)
                accepted = stats["maximumM"] <= limit
                roots_report.append(
                    {
                        "object": item.object_name,
                        "layerId": item.layer_id,
                        "target": item.attachment_target,
                        "sampleCount": len(root_indices),
                        "unsignedGapM": stats,
                        "limitM": limit,
                        "accepted": accepted,
                    }
                )
                if not accepted:
                    issues.append(
                        ValidationIssue(
                            code="geometry.attachment-root.gap",
                            message=(
                                f"Attachment root maximum gap {stats['maximumM']:.6f} m "
                                f"exceeds {limit:.6f} m."
                            ),
                            object_name=item.object_name,
                            layer_id=item.layer_id,
                            target_layer_id=item.attachment_target,
                            frame=frame,
                            evidence={"gapM": stats, "limitM": limit},
                        )
                    )
            except (RuntimeError, ValueError, IndexError) as error:
                issues.append(
                    ValidationIssue(
                        code="geometry.attachment-root.failed",
                        message=str(error),
                        object_name=item.object_name,
                        layer_id=item.layer_id,
                        target_layer_id=item.attachment_target,
                        frame=frame,
                    )
                )

        if item.proxy_layer_id:
            try:
                proxy_items = by_layer.get(item.proxy_layer_id, ())
                if not proxy_items:
                    raise ValueError(
                        f"Proxy layer {item.proxy_layer_id} has no evaluated objects."
                    )
                proxy_snapshots: list[MeshSnapshot] = []
                proxy_source_points: list[tuple[float, float, float]] = []
                for proxy_item in proxy_items:
                    proxy_snapshot = snapshots[id(proxy_item.source)]
                    if not proxy_item.parity_source_mask:
                        raise ValueError(
                            f"Proxy {proxy_item.object_name} lacks "
                            "proxyParitySourceVertexGroup."
                        )
                    proxy_mask_indices = _snapshot_vertex_indices(
                        proxy_snapshot, proxy_item.parity_source_mask
                    )
                    proxy_source_points.extend(
                        proxy_snapshot.vertices[index]
                        for index in proxy_mask_indices
                    )
                    proxy_snapshots.append(
                        _snapshot_for_mask(proxy_snapshot, proxy_item.parity_source_mask)
                    )
                if not item.parity_target_mask:
                    raise ValueError(
                        "Final proxy-linked object lacks proxyParityTargetVertexGroup."
                    )
                final_surface = _snapshot_for_mask(
                    source_snapshot, item.parity_target_mask
                )
                final_mask_indices = _snapshot_vertex_indices(
                    source_snapshot, item.parity_target_mask
                )
                final_source_points = [
                    source_snapshot.vertices[index] for index in final_mask_indices
                ]
                proxy_surface = _combine_snapshots(
                    proxy_snapshots,
                    name=f"proxy:{item.proxy_layer_id}",
                )
                final_query = _BlenderSurfaceQuery(final_surface)
                _proxy_signed, proxy_to_final = final_query.distances(
                    proxy_source_points
                )
                proxy_query = _BlenderSurfaceQuery(proxy_surface)
                _final_signed, final_to_proxy = proxy_query.distances(
                    final_source_points
                )
                proxy_to_final_stats = surface_gap_statistics(proxy_to_final)
                final_to_proxy_stats = surface_gap_statistics(final_to_proxy)
                proxy_bounds = _aabb_metrics(
                    MeshSnapshot(
                        "proxy-parity-points", tuple(proxy_source_points), (), {}
                    )
                )
                final_bounds = _aabb_metrics(
                    MeshSnapshot(
                        "final-parity-points", tuple(final_source_points), (), {}
                    )
                )
                extent_ratios = [
                    (
                        final_bounds["extents"][axis]
                        / proxy_bounds["extents"][axis]
                        if proxy_bounds["extents"][axis] > 1.0e-12
                        else None
                    )
                    for axis in range(3)
                ]
                centroid_distance = _distance(
                    final_bounds["centroid"], proxy_bounds["centroid"]
                )
                limit = thresholds.proxy_final_one_sided_hausdorff_m
                accepted = proxy_to_final_stats["maximumM"] <= limit
                parity_report.append(
                    {
                        "object": item.object_name,
                        "layerId": item.layer_id,
                        "proxyLayerId": item.proxy_layer_id,
                        "oneSidedProxyToFinalM": proxy_to_final_stats,
                        "reverseFinalToProxyM": final_to_proxy_stats,
                        "sampledSymmetricHausdorffM": max(
                            proxy_to_final_stats["maximumM"],
                            final_to_proxy_stats["maximumM"],
                        ),
                        "centroidDistanceM": centroid_distance,
                        "aabbExtentRatiosFinalToProxy": extent_ratios,
                        "oneSidedLimitM": limit,
                        "accepted": accepted,
                    }
                )
                if not accepted:
                    issues.append(
                        ValidationIssue(
                            code="geometry.proxy-parity.hausdorff",
                            message=(
                                "Proxy-to-final one-sided sampled Hausdorff distance "
                                f"{proxy_to_final_stats['maximumM']:.6f} m exceeds "
                                f"{limit:.6f} m."
                            ),
                            object_name=item.object_name,
                            layer_id=item.layer_id,
                            target_layer_id=item.proxy_layer_id,
                            frame=frame,
                            evidence={
                                "oneSidedProxyToFinalM": proxy_to_final_stats,
                                "limitM": limit,
                            },
                        )
                    )
            except (RuntimeError, ValueError, KeyError) as error:
                issues.append(
                    ValidationIssue(
                        code="geometry.proxy-parity.failed",
                        message=str(error),
                        object_name=item.object_name,
                        layer_id=item.layer_id,
                        target_layer_id=item.proxy_layer_id,
                        frame=frame,
                    )
                )

    report = {
        "frame": frame,
        "dynamic": dynamic,
        "relations": relations,
        "contactZones": contracts_report,
        "attachmentRoots": roots_report,
        "proxyParity": parity_report,
        "accepted": not issues,
    }
    return report, issues


def _dynamic_persistence_issues(
    frame_reports: Sequence[Mapping[str, Any]],
    *,
    thresholds: ValidationThresholds,
) -> tuple[dict[str, Any], list[ValidationIssue]]:
    issues: list[ValidationIssue] = []
    by_relation: dict[tuple[str, str, str], list[tuple[int, float]]] = {}
    for frame_report in frame_reports:
        frame = int(frame_report["frame"])
        for relation in frame_report.get("relations", []):
            if relation.get("kind") != "cloth":
                continue
            key = (
                str(relation["object"]),
                str(relation["layerId"]),
                str(relation["target"]),
            )
            penetration = float(relation["signedGapM"]["maximumPenetrationM"])
            by_relation.setdefault(key, []).append((frame, penetration))

    persistence_report: dict[str, Any] = {}
    for (object_name, layer_id, target), samples in sorted(by_relation.items()):
        samples.sort()
        longest = 0
        current = 0
        frames_over: list[int] = []
        for frame, penetration in samples:
            if penetration > thresholds.persistent_penetration_depth_m:
                current += 1
                longest = max(longest, current)
                frames_over.append(frame)
            else:
                current = 0
        key = f"{object_name}->{target}"
        persistence_report[key] = {
            "layerId": layer_id,
            "sampleCount": len(samples),
            "framesOverDepthThreshold": frames_over,
            "depthThresholdM": thresholds.persistent_penetration_depth_m,
            "longestConsecutiveSampleRun": longest,
            "maximumAllowedConsecutiveSamples": (
                thresholds.maximum_consecutive_dynamic_samples
            ),
            "accepted": longest <= thresholds.maximum_consecutive_dynamic_samples,
        }
        if longest > thresholds.maximum_consecutive_dynamic_samples:
            issues.append(
                ValidationIssue(
                    code="geometry.dynamic-penetration.persistence",
                    message=(
                        f"Dynamic cloth penetration deeper than "
                        f"{thresholds.persistent_penetration_depth_m:.6f} m persists for "
                        f"{longest} consecutive samples; maximum is "
                        f"{thresholds.maximum_consecutive_dynamic_samples}."
                    ),
                    object_name=object_name,
                    layer_id=layer_id,
                    target_layer_id=target,
                    evidence=persistence_report[key],
                )
            )
    return persistence_report, issues


def _has_property(source: Any, aliases: Sequence[str]) -> bool:
    return _property(source, aliases)[0]


def discover_dressing_objects(
    *,
    character_id: str,
    collection_names: Sequence[str] = (),
) -> tuple[list[Any], dict[str, list[Any]]]:
    """Discover production dressing objects and named external support surfaces."""

    _require_blender()
    explicit_collections = [
        collection
        for name in collection_names
        if (collection := bpy.data.collections.get(name)) is not None
    ]
    if not explicit_collections:
        explicit_collections = [
            collection
            for collection in bpy.data.collections
            if character_id.casefold() in collection.name.casefold()
            and any(
                token in collection.name.casefold()
                for token in ("garment", "accessor")
            )
        ]
    scoped_ids = {
        id(obj)
        for collection in explicit_collections
        for obj in collection.all_objects
    }
    objects: list[Any] = []
    support_surfaces: dict[str, list[Any]] = {}
    for obj in bpy.data.objects:
        object_character = str(obj.get("characterId", ""))
        if object_character and object_character != character_id:
            continue
        surface_id = str(
            obj.get("dressingSurfaceId", obj.get("surfaceId", ""))
        ).strip()
        if surface_id:
            support_surfaces.setdefault(surface_id, []).append(obj)
        annotated = _has_property(obj, LAYER_ID_KEYS)
        in_scope = id(obj) in scoped_ids
        if not annotated and not in_scope:
            continue
        if not hasattr(obj, "evaluated_get") or obj.type not in {
            "MESH",
            "CURVE",
            "SURFACE",
            "FONT",
            "META",
        }:
            continue
        objects.append(obj)
    return sorted(objects, key=lambda value: value.name), support_surfaces


def validate_blender_scene(
    *,
    character_id: str = "DN-M-AFR-01",
    frames: Sequence[int] | None = None,
    collection_names: Sequence[str] = (),
    profile: str = "full",
    spec: D016GraphSpec = DN_M_AFR_01_SPEC,
    thresholds: ValidationThresholds = ValidationThresholds(),
) -> dict[str, Any]:
    """Validate a Blender scene and return a stable JSON-compatible report."""

    _require_blender()
    scene = bpy.context.scene
    requested_frames = tuple(int(frame) for frame in (frames or (scene.frame_current,)))
    if not requested_frames:
        raise ValueError("At least one frame is required.")
    if len(set(requested_frames)) != len(requested_frames):
        raise ValueError("Frame samples must be unique.")
    requested_frames = tuple(sorted(requested_frames))
    dynamic = len(requested_frames) > 1
    source_objects, support_surfaces = discover_dressing_objects(
        character_id=character_id,
        collection_names=collection_names,
    )
    source_objects, excluded_objects, exclusion_issues = partition_validation_scope(
        source_objects,
        spec=spec,
    )
    items: list[DressingItem] = []
    issues: list[ValidationIssue] = list(exclusion_issues)
    for source in source_objects:
        item, item_issues = normalize_dressing_item(source)
        issues.extend(item_issues)
        if item is not None:
            items.append(item)
    profile_required_layers = required_layers_for_profile(spec, profile)
    graph_report, graph_issues = validate_metadata_graph(
        items,
        spec=spec,
        required_layers=profile_required_layers,
    )
    issues.extend(graph_issues)

    original_frame = int(scene.frame_current)
    frame_reports: list[dict[str, Any]] = []
    try:
        for frame in requested_frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            frame_report, frame_issues = validate_geometry_frame(
                items,
                depsgraph=bpy.context.evaluated_depsgraph_get(),
                frame=frame,
                dynamic=dynamic,
                thresholds=thresholds,
                support_surfaces=support_surfaces,
            )
            frame_reports.append(frame_report)
            issues.extend(frame_issues)
    finally:
        scene.frame_set(original_frame)
        bpy.context.view_layer.update()

    persistence_report, persistence_issues = _dynamic_persistence_issues(
        frame_reports, thresholds=thresholds
    )
    issues.extend(persistence_issues)
    report = {
        "schemaVersion": SCHEMA_VERSION,
        "characterId": character_id,
        "profile": profile,
        "validator": {
            "name": Path(__file__).name,
            "blenderVersion": bpy.app.version_string,
            "blenderVersionSupported": tuple(bpy.app.version) >= (5, 2, 0),
        },
        "thresholds": asdict(thresholds),
        "frames": list(requested_frames),
        "dynamic": dynamic,
        "graph": graph_report,
        "excludedAuthoringHelpers": excluded_objects,
        "frameEvidence": frame_reports,
        "dynamicPenetrationPersistence": persistence_report,
        "issues": [issue.to_json() for issue in issues],
        "accepted": not issues,
    }
    return report


def write_json_report(report: Mapping[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def _parse_frames(value: str | None) -> tuple[int, ...] | None:
    if value is None or not value.strip():
        return None
    frames = tuple(int(part.strip()) for part in value.split(",") if part.strip())
    if not frames:
        raise argparse.ArgumentTypeError("--frames requires comma-separated integers.")
    return frames


def _script_arguments(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate the D016 physical dressing stack in Blender 5.2."
    )
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--character-id", default="DN-M-AFR-01")
    parser.add_argument(
        "--profile",
        choices=VALIDATION_PROFILES,
        default="full",
        help="base validates body and accepted foundations; full requires all layers.",
    )
    parser.add_argument(
        "--frames",
        help="Comma-separated sampled frames. Omit to validate the current frame.",
    )
    parser.add_argument(
        "--collections",
        default="",
        help="Comma-separated garment/accessory collection names.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    args = _script_arguments(argv)
    frames = _parse_frames(args.frames)
    collection_names = tuple(
        value.strip() for value in args.collections.split(",") if value.strip()
    )
    report = validate_blender_scene(
        character_id=args.character_id,
        frames=frames,
        collection_names=collection_names,
        profile=args.profile,
    )
    write_json_report(report, args.output)
    print(
        f"D016 dressing-stack validation: "
        f"{'ACCEPTED' if report['accepted'] else 'REJECTED'}; "
        f"issues={len(report['issues'])}; report={args.output}"
    )
    return 0 if report["accepted"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

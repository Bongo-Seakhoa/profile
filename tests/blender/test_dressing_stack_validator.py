"""Pure-Python tests for the Blender dressing-stack validator core."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[2]
    / "tools"
    / "blender"
    / "dressing_stack_validator.py"
)
SPEC = importlib.util.spec_from_file_location("dressing_stack_validator", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to import {MODULE_PATH}")
validator = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validator
SPEC.loader.exec_module(validator)


class FakeObject(dict):
    def __init__(self, name: str, **metadata: object):
        super().__init__(metadata)
        self.name = name


def normalize(*sources: FakeObject):
    items = []
    issues = []
    for source in sources:
        item, item_issues = validator.normalize_dressing_item(source)
        issues.extend(item_issues)
        if item is not None:
            items.append(item)
    return items, issues


class DressingStackCoreTests(unittest.TestCase):
    def setUp(self):
        self.simple_spec = validator.D016GraphSpec(
            name="test-stack",
            required_layers=("00-body", "10-base"),
            required_dependencies={"10-base": ("00-body",)},
            base_layers=("10-base",),
            required_zones={},
            zone_requirements={},
        )

    def test_normalized_accepted_base_graph_passes(self):
        body = FakeObject(
            "Body",
            dressingLayerId="00-body",
            dressingDependsOnJson="[]",
            fitGateStatus="accepted-primary-body",
        )
        base = FakeObject(
            "Base",
            dressingLayerId="10-base",
            dressingDependsOnJson='["00-body"]',
            dressingCollisionTargetsJson='["00-body"]',
            fitGateStatus="accepted-production-fit",
            baseFitAccepted=True,
        )
        items, normalization_issues = normalize(body, base)
        self.assertEqual(normalization_issues, [])
        report, issues = validator.validate_metadata_graph(
            items,
            spec=self.simple_spec,
            require_geometry_contracts=False,
        )
        self.assertEqual(issues, [])
        self.assertTrue(report["accepted"])
        self.assertEqual(report["topologicalOrder"], ["00-body", "10-base"])

    def test_provisional_base_fails_closed(self):
        body = FakeObject(
            "Body",
            layerId="00-body",
            dependsOn=[],
            fitGateStatus="accepted-primary-body",
        )
        base = FakeObject(
            "Base",
            layerId="10-base",
            dependsOn=["00-body"],
            collisionTargets=["00-body"],
            fitGateStatus="provisional-tailored-fit-proxy",
            baseFitAccepted=True,
        )
        items, _ = normalize(body, base)
        _report, issues = validator.validate_metadata_graph(
            items,
            spec=self.simple_spec,
            require_geometry_contracts=False,
        )
        codes = {issue.code for issue in issues}
        self.assertIn("gate.provisional-item", codes)

    def test_base_profile_does_not_require_later_layers(self):
        body = FakeObject(
            "Body",
            layerId="00-body",
            dependsOn=[],
            fitGateStatus="accepted-primary-body",
        )
        tunic = FakeObject(
            "Tunic",
            layerId="10-base-tunic-sleeves-and-skirt",
            dependsOn=["00-body"],
            collisionTargets=["00-body"],
            fitGateStatus="accepted-production-fit",
            baseFitAccepted=True,
        )
        trousers = FakeObject(
            "Trousers",
            layerId="11-base-trousers",
            dependsOn=["00-body"],
            collisionTargets=["00-body"],
            fitGateStatus="accepted-production-fit",
            baseFitAccepted=True,
        )
        items, _ = normalize(body, tunic, trousers)
        _full_report, full_issues = validator.validate_metadata_graph(
            items,
            spec=validator.DN_M_AFR_01_SPEC,
            require_geometry_contracts=False,
        )
        base_report, base_issues = validator.validate_metadata_graph(
            items,
            spec=validator.DN_M_AFR_01_SPEC,
            require_geometry_contracts=False,
            required_layers=validator.required_layers_for_profile(
                validator.DN_M_AFR_01_SPEC, "base"
            ),
        )
        self.assertIn(
            "graph.required-layer.missing", {issue.code for issue in full_issues}
        )
        self.assertEqual(base_issues, [])
        self.assertTrue(base_report["accepted"])
        self.assertEqual(
            base_report["requiredLayers"],
            [
                "00-body",
                "10-base-tunic-sleeves-and-skirt",
                "11-base-trousers",
            ],
        )

    def test_noncanonical_authoring_helper_can_be_explicitly_excluded(self):
        helper = FakeObject(
            "Tunic form proxy",
            layerId="05-tunic-form-proxy",
            dressingValidationExclude=True,
            dressingValidationExcludeReason="simulation-only form surface",
        )
        included, excluded, issues = validator.partition_validation_scope(
            [helper], spec=validator.DN_M_AFR_01_SPEC
        )
        self.assertEqual(included, [])
        self.assertEqual(issues, [])
        self.assertEqual(excluded[0]["layerId"], "05-tunic-form-proxy")

    def test_required_layer_cannot_exclude_itself(self):
        base = FakeObject(
            "Tunic",
            layerId="10-base-tunic-sleeves-and-skirt",
            dressingValidationExclude=True,
            dressingValidationExcludeReason="incorrect attempted bypass",
        )
        included, excluded, issues = validator.partition_validation_scope(
            [base], spec=validator.DN_M_AFR_01_SPEC
        )
        self.assertEqual(included, [])
        self.assertEqual(excluded, [])
        self.assertIn(
            "metadata.validation-exclude.required-layer",
            {issue.code for issue in issues},
        )

    def test_cycle_is_reported_without_numeric_layer_names(self):
        first = FakeObject(
            "First",
            layerId="layer-a",
            dependsOn=["layer-b"],
            collisionTargets=["layer-b"],
            fitGateStatus="accepted",
        )
        second = FakeObject(
            "Second",
            layerId="layer-b",
            dependsOn=["layer-a"],
            collisionTargets=["layer-a"],
            fitGateStatus="accepted",
        )
        items, _ = normalize(first, second)
        empty_spec = validator.D016GraphSpec(
            name="cycle",
            required_layers=(),
            required_dependencies={},
            base_layers=(),
            required_zones={},
            zone_requirements={},
        )
        _report, issues = validator.validate_metadata_graph(
            items,
            spec=empty_spec,
            require_geometry_contracts=False,
        )
        self.assertIn("graph.cycle", {issue.code for issue in issues})

    def test_loose_contact_threshold_is_rejected(self):
        body = FakeObject(
            "Body",
            layerId="00-body",
            dependsOn=[],
            fitGateStatus="accepted-primary-body",
        )
        base = FakeObject(
            "Base",
            layerId="10-base",
            dependsOn=["00-body"],
            collisionTargets=["00-body"],
            contactContracts=[
                {
                    "zone": "base-body",
                    "target": "00-body",
                    "sourceMask": "support",
                    "p95MaxM": 0.030,
                }
            ],
            fitGateStatus="accepted-production-fit",
            baseFitAccepted=True,
        )
        items, _ = normalize(body, base)
        contract_spec = validator.D016GraphSpec(
            name="contract-strength",
            required_layers=("00-body", "10-base"),
            required_dependencies={"10-base": ("00-body",)},
            base_layers=("10-base",),
            required_zones={"10-base": ("base-body",)},
            zone_requirements={
                "base-body": validator.ZoneRequirement(
                    p95_max_m=0.020,
                    allowed_targets=("00-body",),
                )
            },
        )
        _report, issues = validator.validate_metadata_graph(
            items,
            spec=contract_spec,
        )
        self.assertIn(
            "contract.threshold.missing-or-loose",
            {issue.code for issue in issues},
        )

    def test_connected_patch_area_uses_clipped_surface(self):
        snapshot = validator.MeshSnapshot(
            "square",
            (
                (0.0, 0.0, 0.0),
                (1.0, 0.0, 0.0),
                (1.0, 1.0, 0.0),
                (0.0, 1.0, 0.0),
            ),
            ((0, 1, 2, 3),),
            {},
        )
        result = validator.connected_penetration_patch_metrics(
            snapshot,
            (-0.002, -0.002, -0.002, -0.002),
            penetration_depth_m=0.001,
        )
        self.assertEqual(result["patchCount"], 1)
        self.assertAlmostEqual(result["maximumConnectedAreaM2"], 1.0)
        self.assertAlmostEqual(result["totalAreaM2"], 1.0)

    def test_disconnected_penetration_patches_remain_separate(self):
        snapshot = validator.MeshSnapshot(
            "two-squares",
            (
                (0.0, 0.0, 0.0),
                (1.0, 0.0, 0.0),
                (1.0, 1.0, 0.0),
                (0.0, 1.0, 0.0),
                (3.0, 0.0, 0.0),
                (4.0, 0.0, 0.0),
                (4.0, 1.0, 0.0),
                (3.0, 1.0, 0.0),
            ),
            ((0, 1, 2, 3), (4, 5, 6, 7)),
            {},
        )
        result = validator.connected_penetration_patch_metrics(
            snapshot,
            (-0.002,) * 8,
            penetration_depth_m=0.001,
        )
        self.assertEqual(result["patchCount"], 2)
        self.assertAlmostEqual(result["maximumConnectedAreaM2"], 1.0)
        self.assertAlmostEqual(result["totalAreaM2"], 2.0)

    def test_surface_statistics_are_distributed(self):
        stats = validator.surface_gap_statistics((0.001, 0.002, 0.003, 0.100))
        self.assertEqual(stats["sampleCount"], 4)
        self.assertGreater(stats["p95M"], 0.08)
        self.assertEqual(stats["maximumM"], 0.100)
        self.assertEqual(stats["maximumPenetrationM"], 0.0)


if __name__ == "__main__":
    unittest.main()

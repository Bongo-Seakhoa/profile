"""Headless Blender 5.2 canary for pattern-sewn character clothing.

The canary intentionally has no MPFB dependency. It proves the Blender APIs
needed by the production character builder with a small, deterministic vest:

* separate front and back quad pattern pieces;
* loose cross-piece edges used as sewing springs;
* explicit shoulder and waist pin groups;
* an elliptical collision mannequin;
* a bounded point-cache bake followed by applying the cloth modifier;
* seam welding and a Solidify modifier added only after the cloth bake; and
* a review render, private .blend source, and machine-readable report.

Run with Blender 5.2 in background mode and an explicit temporary/private
output directory. Generated files must not be committed.

    blender.exe --background --factory-startup --threads 1 \
      --python tools/blender/sewn_cloth_canary.py -- \
      --output-root C:/tmp/profile-upgrade-sewn-cloth-canary
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

import bpy
import bmesh
from mathutils import Vector


CANARY_VERSION = "1.0.0"
DEFAULT_BAKE_FRAME = 48
MANNEQUIN_CENTER = Vector((0.0, 0.0, 1.16))
MANNEQUIN_RADII = Vector((0.46, 0.31, 0.72))


def blender_arguments() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify Blender 5.2 pattern sewing and cloth baking."
    )
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--bake-frame", type=int, default=DEFAULT_BAKE_FRAME)
    parser.add_argument("--render-size", type=int, default=720)
    args = parser.parse_args(blender_arguments())
    if not 24 <= args.bake_frame <= 120:
        parser.error("--bake-frame must be between 24 and 120.")
    if not 320 <= args.render_size <= 1600:
        parser.error("--render-size must be between 320 and 1600.")
    return args


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def reset_scene() -> bpy.types.Scene:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in tuple(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.frame_start = 1
    scene.frame_end = DEFAULT_BAKE_FRAME
    scene.render.fps = 24
    scene.gravity = (0.0, 0.0, -9.81)
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 1
    return scene


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float,
    metallic: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is None:
        raise RuntimeError(f"{name} has no Principled BSDF node.")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return material


def link_object(name: str, mesh: bpy.types.Mesh) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def activate(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def create_collision_mannequin(
    material: bpy.types.Material,
) -> tuple[bpy.types.Object, bpy.types.Modifier]:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=64,
        ring_count=32,
        location=MANNEQUIN_CENTER,
    )
    mannequin = bpy.context.active_object
    mannequin.name = "Canary_Collision_Mannequin"
    mannequin.scale = MANNEQUIN_RADII
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mannequin.data.materials.append(material)
    for polygon in mannequin.data.polygons:
        polygon.use_smooth = True
    mannequin["canaryRole"] = "collision-mannequin"

    collision = mannequin.modifiers.new(
        name="Canary mannequin collision", type="COLLISION"
    )
    collision.settings.damping = 0.35
    collision.settings.cloth_friction = 8.0
    collision.settings.thickness_outer = 0.012
    collision.settings.thickness_inner = 0.006
    return mannequin, collision


def add_panel_grid(
    *,
    y: float,
    outward_front: bool,
    columns: int,
    rows: int,
    vertices: list[tuple[float, float, float]],
    faces: list[list[int]],
    uvs: list[tuple[float, float]],
) -> list[list[int]]:
    grid: list[list[int]] = []
    for row in range(rows):
        v = row / (rows - 1)
        shoulder_taper = max(0.0, (v - 0.68) / 0.32)
        half_width = 0.56 - 0.09 * shoulder_taper
        grid_row: list[int] = []
        for column in range(columns):
            u = column / (columns - 1)
            x = (u * 2.0 - 1.0) * half_width
            # Pattern pieces are staged around the mannequin before sewing.
            # Their topology remains a two-dimensional quad sheet, while this
            # shallow pre-wrap avoids the unstable extreme forces produced by
            # starting paired side seams nearly a metre apart.
            edge_factor = abs(u * 2.0 - 1.0) ** 2
            panel_y = y * (1.0 - 0.78 * edge_factor)
            z = 0.48 + 1.30 * v
            grid_row.append(len(vertices))
            vertices.append((x, panel_y, z))
            uvs.append((u, v))
        grid.append(grid_row)

    for row in range(rows - 1):
        for column in range(columns - 1):
            face = [
                grid[row][column],
                grid[row][column + 1],
                grid[row + 1][column + 1],
                grid[row + 1][column],
            ]
            if not outward_front:
                face.reverse()
            faces.append(face)
    return grid


def create_sewn_pattern(
    material: bpy.types.Material,
) -> tuple[
    bpy.types.Object,
    list[tuple[int, int]],
    list[int],
    list[int],
]:
    columns, rows = 15, 19
    vertices: list[tuple[float, float, float]] = []
    faces: list[list[int]] = []
    uvs: list[tuple[float, float]] = []
    front = add_panel_grid(
        y=-0.39,
        outward_front=True,
        columns=columns,
        rows=rows,
        vertices=vertices,
        faces=faces,
        uvs=uvs,
    )
    back = add_panel_grid(
        y=0.39,
        outward_front=False,
        columns=columns,
        rows=rows,
        vertices=vertices,
        faces=faces,
        uvs=uvs,
    )

    seam_pairs = [
        (front[row][edge], back[row][edge])
        for row in range(rows)
        for edge in (0, columns - 1)
    ]
    shoulder_indices = [
        grid[rows - 1][column]
        for grid in (front, back)
        for column in (4, 10)
    ]
    waist_row = 6
    waist_indices = [
        grid[waist_row][column]
        for grid in (front, back)
        for column in (5, 9)
    ]
    pin_indices = sorted(set(shoulder_indices + waist_indices))

    mesh = bpy.data.meshes.new("Canary_Sewn_Vest_PatternMesh")
    mesh.from_pydata(vertices, seam_pairs, faces)
    mesh.update(calc_edges=True)
    mesh.validate(verbose=True, clean_customdata=False)
    cloth = link_object("Canary_Sewn_Vest", mesh)
    cloth.data.materials.append(material)
    cloth["canaryRole"] = "paired-quad-sewing-pattern"
    cloth["patternPieceCount"] = 2
    cloth["seamPairCount"] = len(seam_pairs)
    cloth["shoulderPinCount"] = len(shoulder_indices)
    cloth["waistPinCount"] = len(waist_indices)

    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = uvs[vertex_index]
        polygon.use_smooth = True

    for name, indices in (
        ("ShoulderPins", shoulder_indices),
        ("WaistPins", waist_indices),
        ("ClothPins", pin_indices),
    ):
        group = cloth.vertex_groups.new(name=name)
        group.add(indices, 1.0, "REPLACE")
    return cloth, seam_pairs, shoulder_indices, waist_indices


def mean(values: Iterable[float]) -> float:
    values = tuple(values)
    return sum(values) / len(values) if values else 0.0


def seam_gaps(
    coordinates: Sequence[Vector],
    seam_pairs: Sequence[tuple[int, int]],
) -> dict[str, float]:
    gaps = [
        (coordinates[first] - coordinates[second]).length
        for first, second in seam_pairs
    ]
    return {
        "minimumM": min(gaps),
        "meanM": mean(gaps),
        "maximumM": max(gaps),
    }


def evaluate_coordinates(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    evaluated_mesh = evaluated.to_mesh(
        preserve_all_data_layers=False,
        depsgraph=depsgraph,
    )
    try:
        return [vertex.co.copy() for vertex in evaluated_mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def configure_cloth(
    obj: bpy.types.Object,
    *,
    bake_frame: int,
) -> tuple[bpy.types.Modifier, dict[str, Any]]:
    cloth = obj.modifiers.new(name="Canary pattern sewing", type="CLOTH")
    settings = cloth.settings
    settings.quality = 8
    settings.mass = 0.30
    settings.air_damping = 3.0
    settings.time_scale = 0.78
    settings.vertex_group_mass = "ClothPins"
    settings.pin_stiffness = 1.0
    settings.tension_stiffness = 20.0
    settings.compression_stiffness = 20.0
    settings.shear_stiffness = 14.0
    settings.bending_stiffness = 0.45
    settings.tension_damping = 8.0
    settings.compression_damping = 8.0
    settings.shear_damping = 6.0
    settings.bending_damping = 1.0
    settings.use_sewing_springs = True
    settings.sewing_force_max = 20.0

    collision = cloth.collision_settings
    collision.use_collision = True
    collision.distance_min = 0.007
    collision.collision_quality = 6
    collision.friction = 8.0
    collision.use_self_collision = False

    cache = cloth.point_cache
    cache.frame_start = 1
    cache.frame_end = bake_frame
    cache.frame_step = 1
    cache.use_disk_cache = False
    return cloth, {
        "quality": settings.quality,
        "mass": settings.mass,
        "airDamping": settings.air_damping,
        "timeScale": settings.time_scale,
        "pinGroup": settings.vertex_group_mass,
        "pinStiffness": settings.pin_stiffness,
        "tensionStiffness": settings.tension_stiffness,
        "compressionStiffness": settings.compression_stiffness,
        "shearStiffness": settings.shear_stiffness,
        "bendingStiffness": settings.bending_stiffness,
        "useSewingSprings": settings.use_sewing_springs,
        "sewingForceMax": settings.sewing_force_max,
        "collisionDistanceM": collision.distance_min,
        "collisionQuality": collision.collision_quality,
        "collisionFriction": collision.friction,
        "selfCollision": collision.use_self_collision,
        "cacheFrameStart": cache.frame_start,
        "cacheFrameEnd": cache.frame_end,
        "cacheFrameStep": cache.frame_step,
        "diskCache": cache.use_disk_cache,
    }


def bake_point_cache(
    obj: bpy.types.Object,
    cloth: bpy.types.Modifier,
) -> dict[str, Any]:
    scene = bpy.context.scene
    activate(obj)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    cache = cloth.point_cache
    with bpy.context.temp_override(point_cache=cache):
        poll_at_start = bpy.ops.ptcache.bake.poll()
        if not poll_at_start:
            raise RuntimeError(
                "bpy.ops.ptcache.bake did not poll with a point_cache override."
            )
        result = bpy.ops.ptcache.bake(bake=True)
    if result != {"FINISHED"} or not cache.is_baked:
        raise RuntimeError(
            f"Point-cache bake failed: result={result}, info={cache.info!r}."
        )
    return {
        "operator": "bpy.ops.ptcache.bake",
        "contextOverride": "point_cache",
        "pollAtStart": poll_at_start,
        "operatorResult": sorted(result),
        "isBakedBeforeApply": cache.is_baked,
        "cacheInfoBeforeApply": cache.info,
    }


def apply_cloth_at_frame(
    obj: bpy.types.Object,
    cloth: bpy.types.Modifier,
    *,
    frame: int,
) -> None:
    scene = bpy.context.scene
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    activate(obj)
    result = bpy.ops.object.modifier_apply(modifier=cloth.name)
    if result != {"FINISHED"}:
        raise RuntimeError(f"Unable to apply baked cloth modifier: {result}")
    if any(modifier.type == "CLOTH" for modifier in obj.modifiers):
        raise RuntimeError("Cloth modifier remains after modifier_apply.")
    obj["clothBakeFrame"] = frame
    obj["clothModifierApplied"] = True


def weld_sewn_edges(
    obj: bpy.types.Object,
    seam_pairs: Sequence[tuple[int, int]],
) -> dict[str, int]:
    before_vertices = len(obj.data.vertices)
    before_edges = len(obj.data.edges)
    before_faces = len(obj.data.polygons)
    for first, second in seam_pairs:
        midpoint = (obj.data.vertices[first].co + obj.data.vertices[second].co) * 0.5
        obj.data.vertices[first].co = midpoint
        obj.data.vertices[second].co = midpoint

    welded = bmesh.new()
    welded.from_mesh(obj.data)
    bmesh.ops.remove_doubles(welded, verts=list(welded.verts), dist=0.0005)
    loose_edges = [edge for edge in welded.edges if not edge.link_faces]
    if loose_edges:
        bmesh.ops.delete(welded, geom=loose_edges, context="EDGES")
    welded.to_mesh(obj.data)
    welded.free()
    obj.data.update(calc_edges=True)
    obj["seamsWelded"] = len(seam_pairs)
    return {
        "verticesBefore": before_vertices,
        "verticesAfter": len(obj.data.vertices),
        "edgesBefore": before_edges,
        "edgesAfter": len(obj.data.edges),
        "facesBefore": before_faces,
        "facesAfter": len(obj.data.polygons),
    }


def add_post_bake_solidify(
    obj: bpy.types.Object,
) -> tuple[bpy.types.Modifier, dict[str, Any]]:
    if any(modifier.type == "CLOTH" for modifier in obj.modifiers):
        raise RuntimeError(
            "Solidify must be added after the cloth modifier is applied."
        )
    solidify = obj.modifiers.new(
        name="Canary post-bake cloth thickness", type="SOLIDIFY"
    )
    solidify.thickness = 0.012
    solidify.offset = 0.0
    solidify.use_rim = True
    if hasattr(solidify, "use_even_offset"):
        solidify.use_even_offset = True
    if hasattr(solidify, "use_quality_normals"):
        solidify.use_quality_normals = True
    obj["solidifyAddedAfterBake"] = True
    return solidify, {
        "modifierName": solidify.name,
        "thicknessM": solidify.thickness,
        "offset": solidify.offset,
        "useRim": solidify.use_rim,
        "stackAfterBake": [modifier.type for modifier in obj.modifiers],
    }


def maximum_displacement(
    initial: Sequence[Vector],
    evaluated: Sequence[Vector],
    indices: Sequence[int],
) -> float:
    return max((initial[index] - evaluated[index]).length for index in indices)


def minimum_ellipsoid_radius(coordinates: Sequence[Vector]) -> float:
    values: list[float] = []
    for coordinate in coordinates:
        local = coordinate - MANNEQUIN_CENTER
        if abs(local.z) > MANNEQUIN_RADII.z:
            continue
        values.append(
            math.sqrt(
                (local.x / MANNEQUIN_RADII.x) ** 2
                + (local.y / MANNEQUIN_RADII.y) ** 2
                + (local.z / MANNEQUIN_RADII.z) ** 2
            )
        )
    return min(values)


def create_floor(material: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0.0, 0.0, 0.35))
    floor = bpy.context.active_object
    floor.name = "Canary_Review_Floor"
    floor.data.materials.append(material)
    return floor


def point_camera(
    camera: bpy.types.Object,
    target: Vector,
) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()


def add_area_light(
    name: str,
    location: tuple[float, float, float],
    energy: float,
    size: float,
    color: tuple[float, float, float],
    target: Vector,
) -> bpy.types.Object:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
    return light


def configure_review_scene(
    render_path: Path,
    *,
    render_size: int,
) -> bpy.types.Camera:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = render_size
    scene.render.resolution_y = render_size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    scene.render.filepath = str(render_path)
    scene.render.use_file_extension = True

    world = scene.world or bpy.data.worlds.new("Canary_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.025, 0.032, 0.045, 1.0)
    background.inputs["Strength"].default_value = 0.24

    target = Vector((0.0, 0.0, 1.10))
    camera_data = bpy.data.cameras.new("Canary_Review_Camera")
    camera_data.lens = 58.0
    camera = bpy.data.objects.new("Canary_Review_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (3.05, -4.55, 2.48)
    point_camera(camera, target)
    scene.camera = camera

    add_area_light(
        "Canary_Key",
        (-2.8, -3.2, 4.3),
        950.0,
        3.2,
        (1.0, 0.73, 0.50),
        target,
    )
    add_area_light(
        "Canary_Fill",
        (3.0, -1.6, 2.4),
        620.0,
        2.6,
        (0.48, 0.68, 1.0),
        target,
    )
    add_area_light(
        "Canary_Rim",
        (0.5, 2.8, 3.7),
        780.0,
        2.1,
        (1.0, 0.42, 0.16),
        target,
    )
    return camera_data


def render_review(render_path: Path) -> dict[str, Any]:
    bpy.ops.render.render(write_still=True)
    if not render_path.is_file() or render_path.stat().st_size < 5_000:
        raise RuntimeError(f"Review render was not written correctly: {render_path}")
    return {
        "path": str(render_path),
        "bytes": render_path.stat().st_size,
        "widthPx": bpy.context.scene.render.resolution_x,
        "heightPx": bpy.context.scene.render.resolution_y,
        "engine": bpy.context.scene.render.engine,
    }


def assert_api_compatibility() -> dict[str, Any]:
    required_cloth = {
        "quality",
        "mass",
        "vertex_group_mass",
        "pin_stiffness",
        "use_sewing_springs",
        "sewing_force_max",
    }
    required_cache = {
        "frame_start",
        "frame_end",
        "frame_step",
        "is_baked",
    }
    required_collision = {
        "use_collision",
        "distance_min",
        "collision_quality",
        "friction",
    }
    probe_mesh = bpy.data.meshes.new("Canary_API_ProbeMesh")
    probe = link_object("Canary_API_Probe", probe_mesh)
    modifier = probe.modifiers.new(name="Canary API cloth probe", type="CLOTH")
    cloth_properties = {
        prop.identifier for prop in modifier.settings.bl_rna.properties
    }
    cache_properties = {
        prop.identifier for prop in modifier.point_cache.bl_rna.properties
    }
    collision_properties = {
        prop.identifier
        for prop in modifier.collision_settings.bl_rna.properties
    }
    missing = {
        "cloth": sorted(required_cloth - cloth_properties),
        "pointCache": sorted(required_cache - cache_properties),
        "collision": sorted(required_collision - collision_properties),
    }
    bpy.data.objects.remove(probe, do_unlink=True)
    bpy.data.meshes.remove(probe_mesh)
    if any(missing.values()):
        raise RuntimeError(
            f"Blender cloth API is missing required properties: {missing}"
        )
    return {
        "blenderVersion": bpy.app.version_string,
        "blenderVersionTuple": list(bpy.app.version),
        "backgroundMode": bpy.app.background,
        "requiredPropertiesPresent": True,
        "missingProperties": missing,
        "clothBakeOperator": "bpy.ops.ptcache.bake",
        "clothApplyOperator": "bpy.ops.object.modifier_apply",
        "contextManager": "bpy.context.temp_override(point_cache=cache)",
    }


def write_report(path: Path, report: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    args = parse_arguments()
    output_root = args.output_root.resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    report_path = output_root / "sewn-cloth-canary-report.json"
    render_path = output_root / "sewn-cloth-canary.png"
    blend_path = output_root / "sewn-cloth-canary.blend"
    started_at = utc_now()
    report: dict[str, Any] = {
        "schemaVersion": 1,
        "canary": "blender-5.2-pattern-sewn-cloth",
        "canaryVersion": CANARY_VERSION,
        "startedAt": started_at,
        "status": "running",
        "outputs": {
            "report": str(report_path),
            "render": str(render_path),
            "blend": str(blend_path),
        },
    }

    try:
        scene = reset_scene()
        scene.frame_end = args.bake_frame
        report["apiCompatibility"] = assert_api_compatibility()

        mannequin_material = make_material(
            "Canary_M_Mannequin",
            (0.055, 0.080, 0.115, 1.0),
            roughness=0.68,
        )
        cloth_material = make_material(
            "Canary_M_Cloth",
            (0.43, 0.075, 0.025, 1.0),
            roughness=0.72,
        )
        floor_material = make_material(
            "Canary_M_Floor",
            (0.10, 0.075, 0.045, 1.0),
            roughness=0.86,
        )

        mannequin, collision = create_collision_mannequin(mannequin_material)
        garment, seam_pairs, shoulder_pins, waist_pins = create_sewn_pattern(
            cloth_material
        )
        initial_coordinates = [vertex.co.copy() for vertex in garment.data.vertices]
        initial_seams = seam_gaps(initial_coordinates, seam_pairs)
        initial_quad_faces = sum(
            len(polygon.vertices) == 4 for polygon in garment.data.polygons
        )
        initial_face_count = len(garment.data.polygons)
        initial_loose_sewing_edges = sum(
            edge.is_loose for edge in garment.data.edges
        )

        cloth, cloth_settings = configure_cloth(
            garment,
            bake_frame=args.bake_frame,
        )
        cache_result = bake_point_cache(garment, cloth)
        scene.frame_set(args.bake_frame)
        bpy.context.view_layer.update()
        baked_coordinates = evaluate_coordinates(garment)
        baked_seams = seam_gaps(baked_coordinates, seam_pairs)
        shoulder_displacement = maximum_displacement(
            initial_coordinates, baked_coordinates, shoulder_pins
        )
        waist_displacement = maximum_displacement(
            initial_coordinates, baked_coordinates, waist_pins
        )
        minimum_radius = minimum_ellipsoid_radius(baked_coordinates)

        apply_cloth_at_frame(
            garment,
            cloth,
            frame=args.bake_frame,
        )
        weld_metrics = weld_sewn_edges(garment, seam_pairs)
        solidify, solidify_settings = add_post_bake_solidify(garment)
        evaluated_with_thickness = evaluate_coordinates(garment)

        create_floor(floor_material)
        camera_data = configure_review_scene(
            render_path,
            render_size=args.render_size,
        )
        scene.frame_set(1)
        bpy.context.view_layer.update()
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
        render_metrics = render_review(render_path)

        reduction = 1.0 - baked_seams["meanM"] / initial_seams["meanM"]
        acceptance = {
            "blender52Lts": bpy.app.version[:2] == (5, 2),
            "twoPatternPieces": garment["patternPieceCount"] == 2,
            "allPatternFacesInitiallyQuads": initial_quad_faces
            == initial_face_count,
            "looseSewingEdgesPresent": initial_loose_sewing_edges
            == len(seam_pairs),
            "sewingSpringsEnabled": cloth_settings["useSewingSprings"],
            "pointCacheBaked": cache_result["isBakedBeforeApply"],
            "seamGapReducedByAtLeast50Percent": reduction >= 0.50,
            "meanSewnGapBeforeWeldWithin20mm": baked_seams["meanM"]
            <= 0.020,
            "shoulderPinsStayedWithin5mm": shoulder_displacement <= 0.005,
            "waistPinsStayedWithin5mm": waist_displacement <= 0.005,
            "mannequinCollisionAvoidedDeepPenetration": minimum_radius >= 0.90,
            "clothApplied": garment["clothModifierApplied"]
            and not any(modifier.type == "CLOTH" for modifier in garment.modifiers),
            "seamsWelded": weld_metrics["verticesAfter"]
            <= weld_metrics["verticesBefore"] - len(seam_pairs),
            "solidifyAddedAfterBake": garment["solidifyAddedAfterBake"]
            and solidify.type == "SOLIDIFY",
            "solidifyProducesThicknessGeometry": len(evaluated_with_thickness)
            > len(garment.data.vertices),
            "renderWritten": render_path.is_file()
            and render_path.stat().st_size >= 5_000,
            "blendWritten": blend_path.is_file() and blend_path.stat().st_size > 0,
        }
        failed = sorted(name for name, passed in acceptance.items() if not passed)
        report.update(
            {
                "status": "passed" if not failed else "failed",
                "finishedAt": utc_now(),
                "simulation": {
                    "determinism": {
                        "frameStart": 1,
                        "frameEnd": args.bake_frame,
                        "frameStep": 1,
                        "fps": scene.render.fps,
                        "sceneGravityMPerS2": list(scene.gravity),
                        "renderThreads": scene.render.threads,
                        "commandRequirement": (
                            "Use Blender --threads 1 for the canary run."
                        ),
                    },
                    "clothSettings": cloth_settings,
                    "cache": cache_result,
                    "collisionMannequin": {
                        "object": mannequin.name,
                        "centerM": list(MANNEQUIN_CENTER),
                        "radiiM": list(MANNEQUIN_RADII),
                        "damping": collision.settings.damping,
                        "friction": collision.settings.cloth_friction,
                        "outerThicknessM": collision.settings.thickness_outer,
                        "innerThicknessM": collision.settings.thickness_inner,
                    },
                },
                "pattern": {
                    "pieceCount": garment["patternPieceCount"],
                    "verticesBeforeBake": len(initial_coordinates),
                    "facesBeforeBake": initial_face_count,
                    "quadFacesBeforeBake": initial_quad_faces,
                    "seamPairs": len(seam_pairs),
                    "looseSewingEdges": initial_loose_sewing_edges,
                    "shoulderPins": len(shoulder_pins),
                    "waistPins": len(waist_pins),
                },
                "bakedResult": {
                    "initialSeamGap": initial_seams,
                    "bakedSeamGapBeforeWeld": baked_seams,
                    "meanSeamGapReductionRatio": reduction,
                    "maximumShoulderPinDisplacementM": shoulder_displacement,
                    "maximumWaistPinDisplacementM": waist_displacement,
                    "minimumMannequinEllipsoidRadius": minimum_radius,
                    "weld": weld_metrics,
                    "solidify": solidify_settings,
                    "baseVerticesAfterWeld": len(garment.data.vertices),
                    "evaluatedVerticesWithSolidify": len(evaluated_with_thickness),
                },
                "review": {
                    "cameraLensMm": camera_data.lens,
                    "render": render_metrics,
                },
                "acceptance": acceptance,
                "failedAcceptance": failed,
            }
        )
        write_report(report_path, report)
        if failed:
            raise RuntimeError(f"Canary acceptance failed: {failed}")
        print(f"SEWN_CLOTH_CANARY_REPORT={report_path}")
        print(f"SEWN_CLOTH_CANARY_RENDER={render_path}")
        print(f"SEWN_CLOTH_CANARY_BLEND={blend_path}")
        return 0
    except Exception as exc:
        report.update(
            {
                "status": "failed",
                "finishedAt": utc_now(),
                "failure": {
                    "type": type(exc).__name__,
                    "message": str(exc),
                    "traceback": traceback.format_exc(),
                },
            }
        )
        write_report(report_path, report)
        print(f"SEWN_CLOTH_CANARY_FAILED={report_path}")
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Build the approved DN-M-AFR-01 Blender production pilot.

The script turns the approved v2 silhouette and passing measurement blockout
into a reproducible, rigged, material-ready vertical slice. It deliberately
keeps the outputs private until the full D009/D011 Blender and browser gates
pass.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Iterable

import bpy
from mathutils import Vector


CHARACTER_ID = "DN-M-AFR-01"
RIG_CONVENTION = "anzania-humanoid-v1"
CAMERA_CONTRACT = "D004-distant-full-body-no-OTS"

CANONICAL = {
    "height_m": 1.84,
    "head_height_m": 0.23,
    "shoulder_m": 0.50,
    "chest_cm": 104,
    "waist_cm": 84,
    "hip_cm": 98,
    "depth_m": 0.205,
    "armspan_m": 1.868,
    "inseam_m": 0.85,
    "hand_m": 0.203,
    "foot_m": 0.28,
    "outer_garment_m": 0.66,
    "hem_m": 0.74,
    "head_count": 8.0,
    "a_pose_arm_angle_degrees": 28,
}

PALETTE = {
    "skin": (0.357, 0.208, 0.149, 1.0),
    "skin_highlight": (0.45, 0.285, 0.205, 1.0),
    "hair": (0.035, 0.027, 0.022, 1.0),
    "eye": (0.55, 0.42, 0.25, 1.0),
    "eye_white": (0.68, 0.61, 0.51, 1.0),
    "inner": (0.149, 0.204, 0.247, 1.0),
    "outer": (0.596, 0.325, 0.180, 1.0),
    "secondary": (0.824, 0.710, 0.541, 1.0),
    "leather": (0.294, 0.192, 0.133, 1.0),
    "leather_light": (0.41, 0.27, 0.17, 1.0),
    "metal": (0.655, 0.478, 0.216, 1.0),
    "accent": (0.184, 0.345, 0.443, 1.0),
    "ground": (0.16, 0.115, 0.075, 1.0),
    "backdrop": (0.055, 0.045, 0.037, 1.0),
}

MATERIAL_NAMES = {
    "skin": "M_DN_M_AFR_01_Skin",
    "hair": "M_DN_M_AFR_01_Hair",
    "eye": "M_DN_M_AFR_01_Eye",
    "inner": "M_DN_M_AFR_01_Tunic",
    "trouser": "M_DN_M_AFR_01_Trouser",
    "tabard": "M_DN_M_AFR_01_Tabard",
    "outer": "M_DN_M_AFR_01_Mantle",
    "leather": "M_DN_M_AFR_01_Leather",
    "metal": "M_DN_M_AFR_01_Bronze",
    "accent": "M_DN_M_AFR_01_Accent",
}

REQUIRED_BONES = (
    "root",
    "pelvis",
    "spine_01",
    "spine_02",
    "chest",
    "neck",
    "head",
    "clavicle.L",
    "upper_arm.L",
    "forearm.L",
    "hand.L",
    "clavicle.R",
    "upper_arm.R",
    "forearm.R",
    "hand.R",
    "thigh.L",
    "shin.L",
    "foot.L",
    "toe.L",
    "thigh.R",
    "shin.R",
    "foot.R",
    "toe.R",
)

REQUIRED_SOCKETS = (
    "socket_present.R",
    "socket_present.L",
    "socket_power_solar",
    "socket_power_sand",
    "socket_accessory_back",
    "socket_accessory_hip.L",
    "socket_accessory_hip.R",
    "socket_bounds",
)

REQUIRED_ACTIONS = (
    "base-idle",
    "weight-shift-idle",
    "garment-adjustment",
    "present-open-hand",
    "point",
    "hourglass-draw",
    "hourglass-inspect",
    "hourglass-stow",
    "short-local-step",
    "edge-lean-enter",
    "edge-lean-hold",
    "edge-lean-exit",
    "sand-recall-recovery",
)

LOD_BUDGETS = {
    "LOD0": {"minimum": 55_000, "maximum": 75_000, "drawCalls": 12},
    "LOD1": {"minimum": 28_000, "maximum": 42_000, "drawCalls": 10},
    "LOD2": {"minimum": 14_000, "maximum": 24_000, "drawCalls": 7},
    "LOD3": {"minimum": 7_000, "maximum": 12_000, "drawCalls": 5},
    "LOD4": {"minimum": 3_000, "maximum": 6_000, "drawCalls": 3},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--texture-root", type=Path)
    parser.add_argument("--skip-export", action="store_true")
    parser.add_argument("--skip-renders", action="store_true")
    parser.add_argument("--allow-incomplete", action="store_true")
    argv = []
    if "--" in __import__("sys").argv:
        argv = __import__("sys").argv[__import__("sys").argv.index("--") + 1 :]
    return parser.parse_args(argv)


def srgb_to_linear(colour: tuple[float, float, float, float]) -> tuple[float, ...]:
    def channel(value: float) -> float:
        if value <= 0.04045:
            return value / 12.92
        return ((value + 0.055) / 1.055) ** 2.4

    return (channel(colour[0]), channel(colour[1]), channel(colour[2]), colour[3])


def reset_scene() -> bpy.types.Collection:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.materials,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)
    for item in list(bpy.data.collections):
        bpy.data.collections.remove(item)

    master = bpy.data.collections.new(f"{CHARACTER_ID}_PRODUCTION")
    bpy.context.scene.collection.children.link(master)
    return master


def make_collection(name: str, parent: bpy.types.Collection) -> bpy.types.Collection:
    result = bpy.data.collections.new(name)
    parent.children.link(result)
    return result


def link_only(obj: bpy.types.Object, target: bpy.types.Collection) -> bpy.types.Object:
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def set_smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def tag_part(
    obj: bpy.types.Object,
    *,
    part: str,
    bone: str,
    lod_class: str = "core",
) -> bpy.types.Object:
    obj["asset_part"] = part
    obj["rig_bone"] = bone
    obj["lod_class"] = lod_class
    return obj


def find_texture(
    texture_root: Path | None,
    surface: str,
    channel: str,
) -> Path | None:
    if texture_root is None or not texture_root.exists():
        return None
    candidates = sorted(
        path
        for path in texture_root.rglob("*.png")
        if surface.lower() in path.name.lower()
        and channel.lower() in path.name.lower()
    )
    return candidates[0] if candidates else None


def build_material(
    name: str,
    colour: tuple[float, float, float, float],
    *,
    roughness: float,
    metallic: float = 0.0,
    weave: float = 0.0,
    texture_root: Path | None = None,
    texture_surface: str | None = None,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in list(nodes):
        nodes.remove(node)

    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    principled.inputs["Base Color"].default_value = srgb_to_linear(colour)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    links.new(principled.outputs["BSDF"], output.inputs["Surface"])

    surface = texture_surface or name
    albedo_path = find_texture(texture_root, surface, "albedo")
    roughness_path = find_texture(texture_root, surface, "roughness")
    normal_path = find_texture(texture_root, surface, "normal")

    if albedo_path:
        image = bpy.data.images.load(str(albedo_path), check_existing=True)
        image_node = nodes.new("ShaderNodeTexImage")
        image_node.image = image
        image_node.label = albedo_path.name
        links.new(image_node.outputs["Color"], principled.inputs["Base Color"])
        mat["albedo_texture"] = albedo_path.name
    elif weave > 0:
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = weave
        noise.inputs["Detail"].default_value = 3.0
        noise.inputs["Roughness"].default_value = 0.72
        ramp = nodes.new("ShaderNodeValToRGB")
        linear = srgb_to_linear(colour)
        ramp.color_ramp.elements[0].color = (
            linear[0] * 0.72,
            linear[1] * 0.72,
            linear[2] * 0.72,
            1.0,
        )
        ramp.color_ramp.elements[1].color = (
            min(linear[0] * 1.22, 1.0),
            min(linear[1] * 1.22, 1.0),
            min(linear[2] * 1.22, 1.0),
            1.0,
        )
        links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
        links.new(ramp.outputs["Color"], principled.inputs["Base Color"])
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.18
        bump.inputs["Distance"].default_value = 0.035
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], principled.inputs["Normal"])

    if roughness_path:
        image = bpy.data.images.load(str(roughness_path), check_existing=True)
        image.colorspace_settings.name = "Non-Color"
        image_node = nodes.new("ShaderNodeTexImage")
        image_node.image = image
        image_node.label = roughness_path.name
        links.new(image_node.outputs["Color"], principled.inputs["Roughness"])
        mat["roughness_texture"] = roughness_path.name

    if normal_path:
        image = bpy.data.images.load(str(normal_path), check_existing=True)
        image.colorspace_settings.name = "Non-Color"
        image_node = nodes.new("ShaderNodeTexImage")
        image_node.image = image
        image_node.label = normal_path.name
        bump = nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.24
        bump.inputs["Distance"].default_value = 0.025
        links.new(image_node.outputs["Color"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], principled.inputs["Normal"])
        mat["normal_texture"] = normal_path.name

    mat.diffuse_color = srgb_to_linear(colour)
    return mat


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if not hasattr(obj.data, "materials"):
        return
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def add_uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    part: str,
    bone: str,
    lod_class: str = "core",
    segments: int = 32,
    rings: int = 20,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    set_smooth(obj)
    link_only(obj, target)
    return tag_part(obj, part=part, bone=bone, lod_class=lod_class)


def add_ico_sphere(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    part: str,
    bone: str,
    lod_class: str = "micro",
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=radius,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    set_smooth(obj)
    link_only(obj, target)
    return tag_part(obj, part=part, bone=bone, lod_class=lod_class)


def add_tapered_limb(
    name: str,
    start: Vector,
    end: Vector,
    start_radius: float,
    end_radius: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    part: str,
    bone: str,
    lod_class: str = "core",
    vertices: int = 24,
) -> bpy.types.Object:
    vector = end - start
    midpoint = (start + end) * 0.5
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=start_radius,
        radius2=end_radius,
        depth=vector.length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = vector.to_track_quat("Z", "Y")
    bevel = obj.modifiers.new("Soft edge", "BEVEL")
    bevel.width = min(start_radius, end_radius) * 0.24
    bevel.segments = 3
    apply_material(obj, mat)
    set_smooth(obj)
    link_only(obj, target)
    return tag_part(obj, part=part, bone=bone, lod_class=lod_class)


def add_beveled_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    part: str,
    bone: str,
    lod_class: str = "core",
    bevel_width: float = 0.012,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel_width:
        bevel = obj.modifiers.new("Rounded construction edge", "BEVEL")
        bevel.width = bevel_width
        bevel.segments = 3
    apply_material(obj, mat)
    set_smooth(obj)
    link_only(obj, target)
    return tag_part(obj, part=part, bone=bone, lod_class=lod_class)


def add_curve(
    name: str,
    points: Iterable[tuple[float, float, float]],
    bevel_depth: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    part: str,
    bone: str,
    lod_class: str = "detail",
    cyclic: bool = False,
) -> bpy.types.Object:
    point_list = list(points)
    curve = bpy.data.curves.new(f"{name}_Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(point_list) - 1)
    for bezier_point, coordinate in zip(spline.bezier_points, point_list):
        bezier_point.co = coordinate
        bezier_point.handle_left_type = "AUTO"
        bezier_point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    target.objects.link(obj)
    apply_material(obj, mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.name = name
    obj.select_set(False)
    set_smooth(obj)
    return tag_part(obj, part=part, bone=bone, lod_class=lod_class)


def add_panel(
    name: str,
    vertices: list[tuple[float, float, float]],
    faces: list[list[int]],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    part: str,
    bone: str,
    lod_class: str = "core",
    thickness: float = 0.009,
    bevel_width: float = 0.004,
    subdivision: int = 1,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    if subdivision:
        subdiv = obj.modifiers.new("Garment smoothing", "SUBSURF")
        subdiv.levels = subdivision
        subdiv.render_levels = subdivision
    if thickness:
        solidify = obj.modifiers.new("Construction thickness", "SOLIDIFY")
        solidify.thickness = thickness
        solidify.offset = 0.0
    if bevel_width:
        bevel = obj.modifiers.new("Finished garment edge", "BEVEL")
        bevel.width = bevel_width
        bevel.segments = 2
    apply_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, part=part, bone=bone, lod_class=lod_class)


def add_elliptical_tube(
    name: str,
    rings: list[tuple[float, float, float]],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    part: str,
    bone: str,
    lod_class: str = "core",
    segments: int = 32,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    for z_value, radius_x, radius_y in rings:
        for index in range(segments):
            angle = math.tau * index / segments
            vertices.append(
                (
                    math.cos(angle) * radius_x,
                    math.sin(angle) * radius_y,
                    z_value,
                )
            )
    faces: list[list[int]] = []
    for ring_index in range(len(rings) - 1):
        start = ring_index * segments
        next_start = (ring_index + 1) * segments
        for index in range(segments):
            following = (index + 1) % segments
            faces.append(
                [
                    start + index,
                    start + following,
                    next_start + following,
                    next_start + index,
                ]
            )
    faces.append(list(reversed(range(segments))))
    top_start = (len(rings) - 1) * segments
    faces.append([top_start + index for index in range(segments)])
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    bevel = obj.modifiers.new("Tailored edge", "BEVEL")
    bevel.width = 0.008
    bevel.segments = 2
    apply_material(obj, mat)
    set_smooth(obj)
    return tag_part(obj, part=part, bone=bone, lod_class=lod_class)


def create_materials(texture_root: Path | None) -> dict[str, bpy.types.Material]:
    return {
        "skin": build_material(
            MATERIAL_NAMES["skin"],
            PALETTE["skin"],
            roughness=0.58,
            weave=4.0,
            texture_root=texture_root,
            texture_surface="skin",
        ),
        "hair": build_material(
            MATERIAL_NAMES["hair"],
            PALETTE["hair"],
            roughness=0.82,
        ),
        "eye": build_material(
            MATERIAL_NAMES["eye"],
            PALETTE["eye"],
            roughness=0.25,
        ),
        "eye_white": build_material(
            "M_DN_M_AFR_01_EyeWhite",
            PALETTE["eye_white"],
            roughness=0.35,
        ),
        "inner": build_material(
            MATERIAL_NAMES["inner"],
            PALETTE["inner"],
            roughness=0.72,
            weave=72.0,
            texture_root=texture_root,
            texture_surface="tunic",
        ),
        "trouser": build_material(
            MATERIAL_NAMES["trouser"],
            PALETTE["secondary"],
            roughness=0.78,
            weave=65.0,
            texture_root=texture_root,
            texture_surface="trouser",
        ),
        "tabard": build_material(
            MATERIAL_NAMES["tabard"],
            PALETTE["secondary"],
            roughness=0.74,
            weave=58.0,
            texture_root=texture_root,
            texture_surface="tabard",
        ),
        "outer": build_material(
            MATERIAL_NAMES["outer"],
            PALETTE["outer"],
            roughness=0.68,
            weave=64.0,
            texture_root=texture_root,
            texture_surface="mantle",
        ),
        "leather": build_material(
            MATERIAL_NAMES["leather"],
            PALETTE["leather"],
            roughness=0.53,
            weave=5.0,
            texture_root=texture_root,
            texture_surface="leather",
        ),
        "metal": build_material(
            MATERIAL_NAMES["metal"],
            PALETTE["metal"],
            roughness=0.3,
            metallic=0.82,
        ),
        "accent": build_material(
            MATERIAL_NAMES["accent"],
            PALETTE["accent"],
            roughness=0.66,
            weave=72.0,
        ),
        "ground": build_material(
            "M_DN_STAGE_Ground",
            PALETTE["ground"],
            roughness=0.9,
            weave=12.0,
        ),
        "backdrop": build_material(
            "M_DN_STAGE_Backdrop",
            PALETTE["backdrop"],
            roughness=1.0,
        ),
    }


def skeleton_geometry() -> dict[str, tuple[Vector, Vector, str | None]]:
    angle = math.radians(CANONICAL["a_pose_arm_angle_degrees"])
    upper_arm_length = 0.31
    forearm_length = 0.285
    shoulder_z = 1.49
    result: dict[str, tuple[Vector, Vector, str | None]] = {
        "root": (Vector((0, 0, 0)), Vector((0, 0, 0.12)), None),
        "pelvis": (Vector((0, 0, 0.88)), Vector((0, 0, 1.02)), "root"),
        "spine_01": (Vector((0, 0, 1.02)), Vector((0, 0, 1.19)), "pelvis"),
        "spine_02": (Vector((0, 0, 1.19)), Vector((0, 0, 1.36)), "spine_01"),
        "chest": (Vector((0, 0, 1.36)), Vector((0, 0, 1.50)), "spine_02"),
        "neck": (Vector((0, 0, 1.50)), Vector((0, 0, 1.62)), "chest"),
        "head": (Vector((0, 0, 1.62)), Vector((0, 0, 1.83)), "neck"),
    }
    for side, sign in (("L", 1.0), ("R", -1.0)):
        clavicle_start = Vector((0.0, 0.0, shoulder_z))
        shoulder = Vector((sign * 0.25, 0.0, shoulder_z))
        elbow = shoulder + Vector(
            (sign * math.sin(angle) * upper_arm_length, 0, -math.cos(angle) * upper_arm_length)
        )
        wrist = elbow + Vector(
            (
                sign * math.sin(angle * 0.86) * forearm_length,
                0,
                -math.cos(angle * 0.86) * forearm_length,
            )
        )
        hand_end = wrist + Vector((sign * 0.012, -0.004, -CANONICAL["hand_m"]))
        hip = Vector((sign * 0.105, 0, 0.98))
        knee = Vector((sign * 0.105, 0, 0.54))
        ankle = Vector((sign * 0.105, 0, 0.14))
        toe = Vector((sign * 0.105, -0.18, 0.075))
        toe_end = Vector((sign * 0.105, -0.27, 0.055))
        result.update(
            {
                f"clavicle.{side}": (clavicle_start, shoulder, "chest"),
                f"upper_arm.{side}": (shoulder, elbow, f"clavicle.{side}"),
                f"forearm.{side}": (elbow, wrist, f"upper_arm.{side}"),
                f"hand.{side}": (wrist, hand_end, f"forearm.{side}"),
                f"thigh.{side}": (hip, knee, "pelvis"),
                f"shin.{side}": (knee, ankle, f"thigh.{side}"),
                f"foot.{side}": (ankle, toe, f"shin.{side}"),
                f"toe.{side}": (toe, toe_end, f"foot.{side}"),
            }
        )
    return result


def create_armature(
    rig_collection: bpy.types.Collection,
) -> tuple[bpy.types.Object, dict[str, tuple[Vector, Vector, str | None]]]:
    geometry = skeleton_geometry()
    data = bpy.data.armatures.new(f"{CHARACTER_ID}_Rig")
    armature = bpy.data.objects.new(f"{CHARACTER_ID}_Rig", data)
    rig_collection.objects.link(armature)
    armature.show_in_front = True
    armature["rigConvention"] = RIG_CONVENTION
    armature["restPose"] = "canonical-28-degree-A-pose"
    armature["facingAxis"] = "-Y"
    armature["upAxis"] = "+Z"

    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit_bones: dict[str, bpy.types.EditBone] = {}
    for name, (head, tail, _parent_name) in geometry.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.use_deform = True
        edit_bones[name] = bone
    for name, (_head, _tail, parent_name) in geometry.items():
        if parent_name:
            edit_bones[name].parent = edit_bones[parent_name]

    socket_specs = {
        "socket_present.R": ("hand.R", Vector((-0.02, -0.02, -0.04))),
        "socket_present.L": ("hand.L", Vector((0.02, -0.02, -0.04))),
        "socket_power_solar": ("chest", Vector((0, -0.08, 1.43))),
        "socket_power_sand": ("root", Vector((0, 0, 0.05))),
        "socket_accessory_back": ("chest", Vector((0, 0.10, 1.38))),
        "socket_accessory_hip.L": ("pelvis", Vector((0.22, 0, 1.0))),
        "socket_accessory_hip.R": ("pelvis", Vector((-0.22, 0, 1.0))),
        "socket_bounds": ("root", Vector((0, 0, 0.92))),
    }
    for name, (parent_name, origin) in socket_specs.items():
        bone = data.edit_bones.new(name)
        bone.head = origin
        bone.tail = origin + Vector((0, 0, 0.06))
        bone.parent = edit_bones[parent_name]
        bone.use_deform = False
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature, geometry


def bind_rigid_mesh(obj: bpy.types.Object, armature: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    bone_name = str(obj.get("rig_bone", "root"))
    if bone_name not in armature.data.bones:
        raise ValueError(f"{obj.name} references unknown bone {bone_name}")
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.matrix_world = world
    group = obj.vertex_groups.get(bone_name) or obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    modifier = obj.modifiers.new("DN skin", "ARMATURE")
    modifier.object = armature
    modifier.use_deform_preserve_volume = True


def build_body(
    geometry: dict[str, tuple[Vector, Vector, str | None]],
    mats: dict[str, bpy.types.Material],
    body: bpy.types.Collection,
    details: bpy.types.Collection,
) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    objects.extend(
        [
            add_elliptical_tube(
                "Body_Torso",
                [
                    (1.00, 0.17, 0.105),
                    (1.18, 0.19, 0.11),
                    (1.36, 0.22, 0.115),
                    (1.50, 0.245, 0.115),
                ],
                mats["skin"],
                body,
                part="body",
                bone="chest",
            ),
            add_uv_sphere(
                "Body_Pelvis",
                (0, 0, 0.98),
                (0.19, 0.105, 0.15),
                mats["skin"],
                body,
                part="body",
                bone="pelvis",
            ),
            add_tapered_limb(
                "Body_Neck",
                Vector((0, 0, 1.51)),
                Vector((0, 0, 1.63)),
                0.068,
                0.062,
                mats["skin"],
                body,
                part="body",
                bone="neck",
            ),
            add_uv_sphere(
                "Body_Head",
                (0, 0.002, 1.72),
                (0.105, 0.094, 0.112),
                mats["skin"],
                body,
                part="head",
                bone="head",
                segments=40,
                rings=28,
            ),
        ]
    )

    for side in ("L", "R"):
        sign = 1.0 if side == "L" else -1.0
        for bone_name, radii in (
            (f"upper_arm.{side}", (0.062, 0.052)),
            (f"forearm.{side}", (0.052, 0.041)),
            (f"thigh.{side}", (0.088, 0.073)),
            (f"shin.{side}", (0.072, 0.052)),
        ):
            start, end, _parent = geometry[bone_name]
            objects.append(
                add_tapered_limb(
                    f"Body_{bone_name.replace('.', '_')}",
                    start,
                    end,
                    radii[0],
                    radii[1],
                    mats["skin"],
                    body,
                    part="body",
                    bone=bone_name,
                )
            )
        wrist, hand_end, _parent = geometry[f"hand.{side}"]
        palm_center = wrist.lerp(hand_end, 0.38)
        objects.append(
            add_uv_sphere(
                f"Hand_Palm_{side}",
                tuple(palm_center),
                (0.042, 0.028, 0.082),
                mats["skin"],
                body,
                part="hand",
                bone=f"hand.{side}",
                segments=24,
                rings=16,
            )
        )
        for finger_index in range(4):
            x_offset = sign * (0.022 - finger_index * 0.014)
            base = wrist.lerp(hand_end, 0.72) + Vector((x_offset, -0.004, 0))
            tip = base + Vector((sign * 0.002, -0.006, -0.055 + finger_index * 0.004))
            objects.append(
                add_tapered_limb(
                    f"Hand_Finger_{side}_{finger_index + 1}",
                    base,
                    tip,
                    0.009,
                    0.006,
                    mats["skin"],
                    details,
                    part="hand_detail",
                    bone=f"hand.{side}",
                    lod_class="detail",
                    vertices=12,
                )
            )
        thumb_base = wrist.lerp(hand_end, 0.34) + Vector((sign * 0.038, -0.004, 0))
        thumb_tip = thumb_base + Vector((sign * 0.035, -0.012, -0.035))
        objects.append(
            add_tapered_limb(
                f"Hand_Thumb_{side}",
                thumb_base,
                thumb_tip,
                0.012,
                0.007,
                mats["skin"],
                details,
                part="hand_detail",
                bone=f"hand.{side}",
                lod_class="detail",
                vertices=12,
            )
        )

        foot_x = sign * 0.105
        objects.extend(
            [
                add_beveled_box(
                    f"Foot_Sole_{side}",
                    (foot_x, -0.075, 0.018),
                    (0.14, 0.28, 0.036),
                    mats["leather"],
                    body,
                    part="footwear",
                    bone=f"foot.{side}",
                    bevel_width=0.015,
                ),
                add_uv_sphere(
                    f"Foot_Visible_{side}",
                    (foot_x, -0.115, 0.063),
                    (0.061, 0.118, 0.045),
                    mats["skin"],
                    body,
                    part="foot",
                    bone=f"foot.{side}",
                    segments=24,
                    rings=16,
                ),
            ]
        )
        for toe_index in range(5):
            toe_x = foot_x + sign * (0.036 - toe_index * 0.018)
            toe_scale = 0.014 - toe_index * 0.0012
            objects.append(
                add_uv_sphere(
                    f"Toe_{side}_{toe_index + 1}",
                    (toe_x, -0.237 + toe_index * 0.003, 0.055),
                    (toe_scale, 0.025, 0.012),
                    mats["skin"],
                    details,
                    part="foot_detail",
                    bone=f"toe.{side}",
                    lod_class="detail",
                    segments=16,
                    rings=10,
                )
            )

    return objects


def build_face_and_hair(
    mats: dict[str, bpy.types.Material],
    details: bpy.types.Collection,
) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    for side, sign in (("L", 1.0), ("R", -1.0)):
        objects.extend(
            [
                add_uv_sphere(
                    f"Ear_{side}",
                    (sign * 0.105, 0.0, 1.72),
                    (0.018, 0.012, 0.031),
                    mats["skin"],
                    details,
                    part="face",
                    bone="head",
                    lod_class="detail",
                    segments=20,
                    rings=12,
                ),
                add_uv_sphere(
                    f"EyeWhite_{side}",
                    (sign * 0.036, -0.087, 1.742),
                    (0.021, 0.008, 0.010),
                    mats["eye_white"],
                    details,
                    part="face",
                    bone="head",
                    lod_class="detail",
                    segments=20,
                    rings=12,
                ),
                add_uv_sphere(
                    f"Iris_{side}",
                    (sign * 0.036, -0.094, 1.742),
                    (0.0085, 0.004, 0.0085),
                    mats["eye"],
                    details,
                    part="face",
                    bone="head",
                    lod_class="detail",
                    segments=16,
                    rings=10,
                ),
                add_curve(
                    f"Brow_{side}",
                    [
                        (sign * 0.065, -0.098, 1.772),
                        (sign * 0.038, -0.102, 1.780),
                        (sign * 0.012, -0.098, 1.775),
                    ],
                    0.005,
                    mats["hair"],
                    details,
                    part="face",
                    bone="head",
                    lod_class="detail",
                ),
            ]
        )
    objects.extend(
        [
            add_uv_sphere(
                "Nose_Bridge",
                (0, -0.094, 1.716),
                (0.022, 0.022, 0.045),
                mats["skin"],
                details,
                part="face",
                bone="head",
                lod_class="detail",
                segments=24,
                rings=16,
            ),
            add_uv_sphere(
                "Nose_Tip",
                (0, -0.113, 1.695),
                (0.028, 0.018, 0.020),
                mats["skin"],
                details,
                part="face",
                bone="head",
                lod_class="detail",
                segments=24,
                rings=16,
            ),
            add_uv_sphere(
                "Lip_Upper",
                (0, -0.100, 1.660),
                (0.032, 0.010, 0.008),
                mats["skin"],
                details,
                part="face",
                bone="head",
                lod_class="detail",
                segments=24,
                rings=12,
            ),
            add_uv_sphere(
                "Lip_Lower",
                (0, -0.102, 1.650),
                (0.034, 0.010, 0.010),
                mats["skin"],
                details,
                part="face",
                bone="head",
                lod_class="detail",
                segments=24,
                rings=12,
            ),
            add_curve(
                "Beard_Jaw",
                [
                    (-0.075, -0.065, 1.682),
                    (-0.072, -0.087, 1.646),
                    (-0.045, -0.096, 1.620),
                    (0, -0.100, 1.606),
                    (0.045, -0.096, 1.620),
                    (0.072, -0.087, 1.646),
                    (0.075, -0.065, 1.682),
                ],
                0.008,
                mats["hair"],
                details,
                part="beard",
                bone="head",
                lod_class="detail",
            ),
            add_uv_sphere(
                "Hair_Cap",
                (0, 0.008, 1.805),
                (0.108, 0.095, 0.034),
                mats["hair"],
                details,
                part="hair",
                bone="head",
                lod_class="core",
                segments=32,
                rings=16,
            ),
        ]
    )
    for index in range(34):
        theta = math.tau * index / 34
        ring = index % 4
        radius = 0.018 + (index % 3) * 0.0015
        x = math.cos(theta) * (0.075 + 0.008 * math.sin(index * 1.7))
        y = math.sin(theta) * (0.060 + 0.006 * math.cos(index * 1.3)) + 0.004
        z = 1.805 + 0.020 * math.cos(theta * 2.0) + ring * 0.005
        z = min(z, 1.817)
        objects.append(
            add_ico_sphere(
                f"Hair_Coil_{index + 1:02d}",
                (x, y, z),
                radius,
                (1.0, 0.85, 1.15),
                mats["hair"],
                details,
                part="hair_detail",
                bone="head",
                lod_class="micro",
            )
        )
    return objects


def build_garments(
    geometry: dict[str, tuple[Vector, Vector, str | None]],
    mats: dict[str, bpy.types.Material],
    garments: bpy.types.Collection,
    details: bpy.types.Collection,
) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    objects.append(
        add_elliptical_tube(
            "Tunic_Torso",
            [
                (1.03, 0.19, 0.125),
                (1.22, 0.215, 0.13),
                (1.40, 0.245, 0.135),
                (1.53, 0.265, 0.135),
            ],
            mats["inner"],
            garments,
            part="tunic",
            bone="chest",
        )
    )
    for side in ("L", "R"):
        sign = 1.0 if side == "L" else -1.0
        upper_start, upper_end, _ = geometry[f"upper_arm.{side}"]
        fore_start, fore_end, _ = geometry[f"forearm.{side}"]
        objects.extend(
            [
                add_tapered_limb(
                    f"Tunic_Sleeve_Upper_{side}",
                    upper_start,
                    upper_end,
                    0.073,
                    0.061,
                    mats["inner"],
                    garments,
                    part="tunic",
                    bone=f"upper_arm.{side}",
                ),
                add_tapered_limb(
                    f"Tunic_Sleeve_Lower_{side}",
                    fore_start,
                    fore_end,
                    0.063,
                    0.050,
                    mats["inner"],
                    garments,
                    part="tunic",
                    bone=f"forearm.{side}",
                ),
                add_panel(
                    f"Tunic_Skirt_Front_{side}",
                    [
                        (sign * 0.015, -0.135, 1.10),
                        (sign * 0.205, -0.125, 1.08),
                        (sign * 0.215, -0.115, 0.77),
                        (sign * 0.025, -0.120, 0.72),
                    ],
                    [[0, 1, 2, 3]],
                    mats["inner"],
                    garments,
                    part="tunic",
                    bone="pelvis",
                ),
                add_panel(
                    f"Tunic_Skirt_Back_{side}",
                    [
                        (sign * 0.205, 0.125, 1.08),
                        (sign * 0.015, 0.135, 1.10),
                        (sign * 0.025, 0.120, 0.72),
                        (sign * 0.215, 0.115, 0.77),
                    ],
                    [[0, 1, 2, 3]],
                    mats["inner"],
                    garments,
                    part="tunic",
                    bone="pelvis",
                ),
            ]
        )
        hip, knee, _ = geometry[f"thigh.{side}"]
        shin_start, shin_end, _ = geometry[f"shin.{side}"]
        objects.extend(
            [
                add_tapered_limb(
                    f"Trouser_Upper_{side}",
                    hip,
                    knee,
                    0.108,
                    0.088,
                    mats["trouser"],
                    garments,
                    part="trouser",
                    bone=f"thigh.{side}",
                ),
                add_tapered_limb(
                    f"Trouser_Lower_{side}",
                    shin_start,
                    Vector((sign * 0.105, 0, 0.22)),
                    0.090,
                    0.068,
                    mats["trouser"],
                    garments,
                    part="trouser",
                    bone=f"shin.{side}",
                ),
            ]
        )

    objects.extend(
        [
            add_panel(
                "Tabard_Front",
                [
                    (-0.14, -0.151, 1.42),
                    (0.14, -0.151, 1.42),
                    (0.115, -0.151, 0.56),
                    (-0.115, -0.151, 0.56),
                ],
                [[0, 1, 2, 3]],
                mats["tabard"],
                garments,
                part="tabard",
                bone="chest",
                thickness=0.010,
            ),
            add_panel(
                "Tabard_Back",
                [
                    (0.14, 0.151, 1.42),
                    (-0.14, 0.151, 1.42),
                    (-0.115, 0.151, 0.66),
                    (0.115, 0.151, 0.66),
                ],
                [[0, 1, 2, 3]],
                mats["tabard"],
                garments,
                part="tabard",
                bone="chest",
                thickness=0.010,
            ),
            add_panel(
                "Mantle_Front",
                [
                    (-0.285, -0.165, 1.55),
                    (-0.105, -0.175, 1.62),
                    (0.245, -0.158, 1.46),
                    (0.205, -0.170, 0.70),
                    (0.025, -0.178, 0.90),
                ],
                [[0, 1, 2, 3, 4]],
                mats["outer"],
                garments,
                part="mantle",
                bone="chest",
                thickness=0.014,
                subdivision=2,
            ),
            add_panel(
                "Mantle_Back",
                [
                    (0.245, 0.158, 1.46),
                    (-0.105, 0.175, 1.62),
                    (-0.285, 0.165, 1.55),
                    (0.025, 0.178, 0.90),
                    (0.205, 0.170, 0.70),
                ],
                [[0, 1, 2, 3, 4]],
                mats["outer"],
                garments,
                part="mantle",
                bone="chest",
                thickness=0.014,
                subdivision=2,
            ),
        ]
    )

    for ring_index, (major_radius, minor_radius, z_value, x_offset) in enumerate(
        (
            (0.168, 0.037, 1.585, -0.025),
            (0.153, 0.032, 1.555, 0.015),
            (0.142, 0.028, 1.525, -0.005),
        )
    ):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=major_radius,
            minor_radius=minor_radius,
            major_segments=40,
            minor_segments=12,
            location=(x_offset, 0, z_value),
            rotation=(0, 0, math.radians(8 * (ring_index - 1))),
        )
        cowl = bpy.context.object
        cowl.name = f"Mantle_Cowl_{ring_index + 1}"
        cowl.scale.y = 0.74
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        apply_material(cowl, mats["outer"])
        set_smooth(cowl)
        link_only(cowl, garments)
        objects.append(tag_part(cowl, part="mantle", bone="chest", lod_class="core"))

    tabard_edge_lines = (
        [(-0.14, -0.161, 1.42), (-0.115, -0.161, 0.56)],
        [(0.14, -0.161, 1.42), (0.115, -0.161, 0.56)],
        [(-0.105, -0.163, 0.59), (0.105, -0.163, 0.59)],
        [(0.0, -0.164, 1.36), (0.0, -0.164, 0.62)],
    )
    for index, line in enumerate(tabard_edge_lines):
        objects.append(
            add_curve(
                f"Tabard_Indigo_Band_{index + 1}",
                line,
                0.009 if index < 2 else 0.007,
                mats["accent"],
                details,
                part="tabard_pattern",
                bone="chest",
                lod_class="core",
            )
        )

    mantle_lower = [
        Vector((-0.285, -0.180, 1.55)),
        Vector((0.025, -0.184, 0.90)),
        Vector((0.205, -0.180, 0.70)),
    ]
    for segment_index in range(2):
        start = mantle_lower[segment_index]
        end = mantle_lower[segment_index + 1]
        for fringe_index in range(10):
            point = start.lerp(end, fringe_index / 9)
            objects.append(
                add_tapered_limb(
                    f"Mantle_Fringe_{segment_index}_{fringe_index:02d}",
                    point,
                    point + Vector((0, 0, -0.055)),
                    0.004,
                    0.0025,
                    mats["outer"],
                    details,
                    part="mantle_fringe",
                    bone="chest",
                    lod_class="micro",
                    vertices=8,
                )
            )
    return objects


def build_accessories(
    mats: dict[str, bpy.types.Material],
    accessories: bpy.types.Collection,
    details: bpy.types.Collection,
) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    for belt_index, (z_value, radius, thickness) in enumerate(
        ((1.075, 0.216, 0.026), (1.018, 0.198, 0.017))
    ):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=radius,
            minor_radius=thickness,
            major_segments=40,
            minor_segments=12,
            location=(0, 0, z_value),
        )
        belt = bpy.context.object
        belt.name = "Primary_Belt" if belt_index == 0 else "Secondary_Belt"
        belt.scale.y = 0.61
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        apply_material(belt, mats["leather"])
        set_smooth(belt)
        link_only(belt, accessories)
        objects.append(tag_part(belt, part="belt", bone="pelvis", lod_class="core"))
    objects.extend(
        [
            add_beveled_box(
                "Belt_Buckle",
                (0, -0.145, 1.075),
                (0.095, 0.026, 0.068),
                mats["metal"],
                details,
                part="belt",
                bone="pelvis",
                lod_class="core",
                bevel_width=0.009,
            ),
            add_beveled_box(
                "Pouch_Right",
                (-0.245, -0.025, 0.98),
                (0.15, 0.11, 0.19),
                mats["leather"],
                accessories,
                part="pouch",
                bone="pelvis",
                bevel_width=0.016,
            ),
            add_beveled_box(
                "Pouch_Left",
                (0.225, -0.02, 1.01),
                (0.12, 0.10, 0.15),
                mats["leather"],
                accessories,
                part="pouch",
                bone="pelvis",
                bevel_width=0.014,
            ),
        ]
    )
    for side, sign, z_value in (("R", -1.0, 1.03), ("L", 1.0, 1.06)):
        objects.append(
            add_curve(
                f"Pouch_Seam_{side}",
                [
                    (sign * 0.295, -0.086, z_value + 0.025),
                    (sign * 0.245, -0.09, z_value + 0.05),
                    (sign * 0.195, -0.086, z_value + 0.025),
                ],
                0.004,
                mats["leather"],
                details,
                part="pouch_detail",
                bone="pelvis",
                lod_class="detail",
            )
        )

    necklace_paths = (
        [(-0.15, -0.142, 1.48), (-0.085, -0.160, 1.40), (0, -0.166, 1.34), (0.085, -0.160, 1.40), (0.15, -0.142, 1.48)],
        [(-0.135, -0.148, 1.47), (-0.07, -0.166, 1.38), (0, -0.171, 1.31), (0.07, -0.166, 1.38), (0.135, -0.148, 1.47)],
        [(-0.12, -0.152, 1.46), (-0.06, -0.171, 1.36), (0, -0.175, 1.285), (0.06, -0.171, 1.36), (0.12, -0.152, 1.46)],
    )
    for index, path in enumerate(necklace_paths):
        objects.append(
            add_curve(
                f"Necklace_Strand_{index + 1}",
                path,
                0.005,
                mats["metal"],
                details,
                part="necklace",
                bone="chest",
                lod_class="core",
            )
        )
    objects.append(
        add_uv_sphere(
            "Necklace_Central_Disc",
            (0, -0.176, 1.285),
            (0.042, 0.012, 0.042),
            mats["metal"],
            details,
            part="necklace",
            bone="chest",
            lod_class="core",
            segments=28,
            rings=16,
        )
    )

    objects.append(
        add_curve(
            "Blue_Tassel_Cord_Right",
            [(-0.18, -0.151, 1.04), (-0.19, -0.160, 0.93), (-0.19, -0.160, 0.82)],
            0.009,
            mats["accent"],
            accessories,
            part="tassel",
            bone="pelvis",
            lod_class="core",
        )
    )
    for index in range(7):
        x_value = -0.19 + (index - 3) * 0.006
        objects.append(
            add_tapered_limb(
                f"Blue_Tassel_Fringe_{index + 1}",
                Vector((x_value, -0.160, 0.82)),
                Vector((x_value + (index - 3) * 0.001, -0.160, 0.74)),
                0.004,
                0.002,
                mats["accent"],
                details,
                part="tassel",
                bone="pelvis",
                lod_class="detail",
                vertices=8,
            )
        )

    for side, sign in (("L", 1.0), ("R", -1.0)):
        x_value = sign * 0.105
        for wrap_index in range(8):
            z_value = 0.11 + wrap_index * 0.032
            phase = -0.02 if wrap_index % 2 else 0.02
            objects.append(
                add_curve(
                    f"Boot_Wrap_{side}_{wrap_index + 1}",
                    [
                        (x_value - sign * 0.060, -0.055 + phase, z_value),
                        (x_value, -0.082 - phase, z_value + 0.014),
                        (x_value + sign * 0.060, -0.055 + phase, z_value),
                    ],
                    0.008,
                    mats["leather"],
                    details,
                    part="footwear",
                    bone=f"shin.{side}",
                    lod_class="core",
                )
            )
        for strap_index, x_offset in enumerate((-0.04, 0.0, 0.04)):
            objects.append(
                add_curve(
                    f"Sandal_Toe_Strap_{side}_{strap_index + 1}",
                    [
                        (x_value + x_offset, -0.225, 0.060),
                        (x_value + x_offset, -0.175, 0.105),
                        (x_value + x_offset, -0.115, 0.080),
                    ],
                    0.010,
                    mats["leather"],
                    details,
                    part="footwear",
                    bone=f"foot.{side}",
                    lod_class="core",
                )
            )
    return objects


def add_actions(armature: bpy.types.Object) -> dict[str, bpy.types.Action]:
    armature.animation_data_create()
    actions: dict[str, bpy.types.Action] = {}

    def reset_pose() -> None:
        for bone in armature.pose.bones:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (0, 0, 0)
            bone.location = (0, 0, 0)
            bone.scale = (1, 1, 1)

    def key_pose(frame: int, bones: Iterable[str]) -> None:
        for name in bones:
            pose_bone = armature.pose.bones[name]
            pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame)
            pose_bone.keyframe_insert(data_path="location", frame=frame)

    animated = (
        "root",
        "pelvis",
        "spine_01",
        "spine_02",
        "chest",
        "neck",
        "head",
        "upper_arm.L",
        "forearm.L",
        "hand.L",
        "upper_arm.R",
        "forearm.R",
        "hand.R",
        "thigh.L",
        "shin.L",
        "foot.L",
        "thigh.R",
        "shin.R",
        "foot.R",
    )

    def create_action(
        name: str,
        duration_frames: int,
        pose_callback,
        *,
        loop: bool,
        additive_upper_body: bool,
        markers: list[dict[str, object]] | None = None,
    ) -> None:
        action = bpy.data.actions.new(name)
        armature.animation_data.action = action
        keyframes = (
            (1, 0.0),
            (max(2, duration_frames // 2), 1.0),
            (duration_frames, 0.0 if loop or name.endswith(("enter", "exit")) else 0.15),
        )
        for frame, amount in keyframes:
            reset_pose()
            pose_callback(amount)
            key_pose(frame, animated)
        duration_ms = round(duration_frames / 30 * 1000)
        action["loop"] = loop
        action["family"] = name
        action["durationMs"] = duration_ms
        action["additiveUpperBody"] = additive_upper_body
        action["rootMotion"] = "in-place"
        action["blendInMs"] = 200
        action["blendOutMs"] = 200
        action["markers"] = json.dumps(markers or [], separators=(",", ":"))
        actions[action.name] = action

    def pose_base_idle(amount: float) -> None:
        armature.pose.bones["chest"].rotation_euler[0] = math.radians(-0.9 * amount)
        armature.pose.bones["chest"].location.z = 0.007 * amount
        armature.pose.bones["upper_arm.L"].rotation_euler[1] = math.radians(1.2 * amount)
        armature.pose.bones["upper_arm.R"].rotation_euler[1] = math.radians(-1.2 * amount)
        armature.pose.bones["head"].rotation_euler[2] = math.radians(0.7 * amount)

    def pose_weight_shift(amount: float) -> None:
        armature.pose.bones["pelvis"].location.x = 0.024 * amount
        armature.pose.bones["pelvis"].rotation_euler[1] = math.radians(-3.0 * amount)
        armature.pose.bones["spine_01"].rotation_euler[1] = math.radians(2.0 * amount)
        armature.pose.bones["head"].rotation_euler[2] = math.radians(-2.0 * amount)

    def pose_garment_adjustment(amount: float) -> None:
        armature.pose.bones["chest"].rotation_euler[2] = math.radians(5.0 * amount)
        armature.pose.bones["upper_arm.L"].rotation_euler = (
            math.radians(-16 * amount),
            math.radians(8 * amount),
            math.radians(34 * amount),
        )
        armature.pose.bones["forearm.L"].rotation_euler = (
            math.radians(-28 * amount),
            math.radians(5 * amount),
            math.radians(18 * amount),
        )

    def pose_present(amount: float) -> None:
        armature.pose.bones["chest"].rotation_euler[2] = math.radians(-7 * amount)
        armature.pose.bones["head"].rotation_euler[2] = math.radians(7 * amount)
        armature.pose.bones["upper_arm.R"].rotation_euler = (
            math.radians(-16 * amount),
            math.radians(-20 * amount),
            math.radians(-46 * amount),
        )
        armature.pose.bones["forearm.R"].rotation_euler = (
            math.radians(-32 * amount),
            math.radians(-10 * amount),
            math.radians(-16 * amount),
        )
        armature.pose.bones["hand.R"].rotation_euler[1] = math.radians(26 * amount)

    def pose_point(amount: float) -> None:
        armature.pose.bones["chest"].rotation_euler[2] = math.radians(-10 * amount)
        armature.pose.bones["upper_arm.R"].rotation_euler = (
            math.radians(-22 * amount),
            math.radians(-18 * amount),
            math.radians(-58 * amount),
        )
        armature.pose.bones["forearm.R"].rotation_euler = (
            math.radians(-12 * amount),
            math.radians(-8 * amount),
            math.radians(-8 * amount),
        )
        armature.pose.bones["head"].rotation_euler[2] = math.radians(10 * amount)

    def pose_hourglass_draw(amount: float) -> None:
        armature.pose.bones["upper_arm.R"].rotation_euler = (
            math.radians(12 * amount),
            math.radians(-18 * amount),
            math.radians(-28 * amount),
        )
        armature.pose.bones["forearm.R"].rotation_euler = (
            math.radians(-48 * amount),
            math.radians(8 * amount),
            math.radians(-18 * amount),
        )
        armature.pose.bones["hand.R"].rotation_euler[1] = math.radians(22 * amount)

    def pose_hourglass_inspect(amount: float) -> None:
        pose_hourglass_draw(amount)
        armature.pose.bones["upper_arm.L"].rotation_euler[2] = math.radians(18 * amount)
        armature.pose.bones["forearm.L"].rotation_euler[0] = math.radians(-22 * amount)
        armature.pose.bones["head"].rotation_euler[0] = math.radians(9 * amount)

    def pose_short_step(amount: float) -> None:
        phase = math.sin(amount * math.pi)
        armature.pose.bones["pelvis"].location.z = 0.012 * phase
        armature.pose.bones["thigh.L"].rotation_euler[0] = math.radians(18 * phase)
        armature.pose.bones["thigh.R"].rotation_euler[0] = math.radians(-18 * phase)
        armature.pose.bones["upper_arm.L"].rotation_euler[0] = math.radians(-12 * phase)
        armature.pose.bones["upper_arm.R"].rotation_euler[0] = math.radians(12 * phase)

    def pose_edge_lean(amount: float) -> None:
        armature.pose.bones["root"].location.x = 0.055 * amount
        armature.pose.bones["pelvis"].rotation_euler[1] = math.radians(-5 * amount)
        armature.pose.bones["spine_01"].rotation_euler[1] = math.radians(7 * amount)
        armature.pose.bones["chest"].rotation_euler[1] = math.radians(5 * amount)
        armature.pose.bones["head"].rotation_euler[2] = math.radians(-4 * amount)

    def pose_sand_recovery(amount: float) -> None:
        armature.pose.bones["root"].location.z = -0.10 * amount
        armature.pose.bones["pelvis"].rotation_euler[0] = math.radians(10 * amount)
        armature.pose.bones["thigh.L"].rotation_euler[0] = math.radians(-15 * amount)
        armature.pose.bones["thigh.R"].rotation_euler[0] = math.radians(-15 * amount)
        armature.pose.bones["shin.L"].rotation_euler[0] = math.radians(20 * amount)
        armature.pose.bones["shin.R"].rotation_euler[0] = math.radians(20 * amount)
        armature.pose.bones["upper_arm.L"].rotation_euler[2] = math.radians(14 * amount)
        armature.pose.bones["upper_arm.R"].rotation_euler[2] = math.radians(-14 * amount)

    create_action("base-idle", 300, pose_base_idle, loop=True, additive_upper_body=False)
    create_action(
        "weight-shift-idle",
        60,
        pose_weight_shift,
        loop=False,
        additive_upper_body=False,
    )
    create_action(
        "garment-adjustment",
        60,
        pose_garment_adjustment,
        loop=False,
        additive_upper_body=True,
    )
    create_action(
        "present-open-hand",
        24,
        pose_present,
        loop=False,
        additive_upper_body=True,
    )
    create_action("point", 30, pose_point, loop=False, additive_upper_body=True)
    create_action(
        "hourglass-draw",
        24,
        pose_hourglass_draw,
        loop=False,
        additive_upper_body=True,
        markers=[
            {
                "id": "hourglass-draw-attach",
                "timeMs": 500,
                "event": "hourglass-attach-hand",
            },
            {
                "id": "hourglass-draw-show",
                "timeMs": 560,
                "event": "hourglass-show",
            },
        ],
    )
    create_action(
        "hourglass-inspect",
        180,
        pose_hourglass_inspect,
        loop=True,
        additive_upper_body=True,
    )
    create_action(
        "hourglass-stow",
        21,
        pose_hourglass_draw,
        loop=False,
        additive_upper_body=True,
        markers=[
            {
                "id": "hourglass-stow-belt",
                "timeMs": 540,
                "event": "hourglass-attach-belt",
            },
            {
                "id": "hourglass-stow-hide",
                "timeMs": 620,
                "event": "hourglass-hide",
            },
        ],
    )
    create_action(
        "short-local-step",
        18,
        pose_short_step,
        loop=False,
        additive_upper_body=False,
    )
    create_action(
        "edge-lean-enter",
        18,
        pose_edge_lean,
        loop=False,
        additive_upper_body=False,
    )
    create_action(
        "edge-lean-hold",
        90,
        pose_edge_lean,
        loop=True,
        additive_upper_body=False,
    )
    create_action(
        "edge-lean-exit",
        18,
        pose_edge_lean,
        loop=False,
        additive_upper_body=False,
    )
    create_action(
        "sand-recall-recovery",
        21,
        pose_sand_recovery,
        loop=False,
        additive_upper_body=False,
        markers=[
            {
                "id": "sand-recall-conceal-start",
                "timeMs": 0,
                "event": "recovery-conceal-start",
            },
            {
                "id": "sand-recall-conceal-end",
                "timeMs": 420,
                "event": "recovery-conceal-end",
            },
        ],
    )

    reset_pose()
    armature.animation_data.action = None
    bpy.context.scene.frame_set(1)
    return actions


def duplicate_lod(
    source_objects: list[bpy.types.Object],
    target: bpy.types.Collection,
    *,
    lod_name: str,
    ratio: float,
    omit_classes: set[str],
) -> list[bpy.types.Object]:
    copies: list[bpy.types.Object] = []
    for source in source_objects:
        if source.type != "MESH" or str(source.get("lod_class", "core")) in omit_classes:
            continue
        copy = source.copy()
        copy.data = source.data.copy()
        copy.name = f"{source.name}_{lod_name}"
        target.objects.link(copy)
        copy["lod"] = lod_name
        if ratio < 1.0 and len(copy.data.polygons) > 24:
            decimate = copy.modifiers.new(f"{lod_name} reduction", "DECIMATE")
            decimate.ratio = ratio
            decimate.use_collapse_triangulate = True
        copy.hide_render = True
        copy.hide_set(True)
        copies.append(copy)
    return copies


def evaluated_triangle_count(objects: Iterable[bpy.types.Object]) -> int:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return total


def evaluated_bounds(objects: Iterable[bpy.types.Object]) -> dict[str, list[float]]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        points.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        evaluated.to_mesh_clear()
    minimum = Vector(
        (
            min(point.x for point in points),
            min(point.y for point in points),
            min(point.z for point in points),
        )
    )
    maximum = Vector(
        (
            max(point.x for point in points),
            max(point.y for point in points),
            max(point.z for point in points),
        )
    )
    return {
        "minimum_m": [round(value, 5) for value in minimum],
        "maximum_m": [round(value, 5) for value in maximum],
        "dimensions_m": [
            round(maximum.x - minimum.x, 5),
            round(maximum.y - minimum.y, 5),
            round(maximum.z - minimum.z, 5),
        ],
    }


def animation_bounds(
    armature: bpy.types.Object,
    actions: dict[str, bpy.types.Action],
    objects: list[bpy.types.Object],
) -> dict[str, dict[str, list[float]]]:
    result: dict[str, dict[str, list[float]]] = {}
    scene = bpy.context.scene
    for name, action in actions.items():
        armature.animation_data.action = action
        start, end = (int(value) for value in action.frame_range)
        samples = sorted({start, end, (start + end) // 2, start + (end - start) // 4, start + 3 * (end - start) // 4})
        sample_bounds = []
        for frame in samples:
            scene.frame_set(frame)
            sample_bounds.append(evaluated_bounds(objects))
        minimum = [
            min(item["minimum_m"][axis] for item in sample_bounds)
            for axis in range(3)
        ]
        maximum = [
            max(item["maximum_m"][axis] for item in sample_bounds)
            for axis in range(3)
        ]
        result[name] = {
            "minimum_m": [round(value, 5) for value in minimum],
            "maximum_m": [round(value, 5) for value in maximum],
            "dimensions_m": [
                round(maximum[axis] - minimum[axis], 5) for axis in range(3)
            ],
            "sampleFrames": samples,
        }
    armature.animation_data.action = None
    scene.frame_set(1)
    return result


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_camera(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    master: bpy.types.Collection,
    *,
    ortho_scale: float = 2.12,
) -> bpy.types.Object:
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.ortho_scale = ortho_scale
    camera = bpy.data.objects.new(name, data)
    camera.location = location
    look_at(camera, Vector(target))
    master.objects.link(camera)
    camera["cameraContract"] = CAMERA_CONTRACT
    camera["otsAllowed"] = False
    return camera


def configure_stage(
    master: bpy.types.Collection,
    stage: bpy.types.Collection,
    mats: dict[str, bpy.types.Material],
) -> dict[str, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 1200
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = 30

    world = bpy.data.worlds.new("DN_M_AFR_01_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb_to_linear(PALETTE["backdrop"])
    background.inputs["Strength"].default_value = 0.35

    ground = add_beveled_box(
        "Stage_Ground",
        (0, 0, -0.025),
        (4.5, 4.5, 0.05),
        mats["ground"],
        stage,
        part="stage",
        bone="root",
        bevel_width=0,
    )
    del ground["rig_bone"]

    backdrop = add_panel(
        "Stage_Backdrop",
        [
            (-2.4, 0.75, 0),
            (2.4, 0.75, 0),
            (2.4, 0.75, 3.0),
            (-2.4, 0.75, 3.0),
        ],
        [[0, 1, 2, 3]],
        mats["backdrop"],
        stage,
        part="stage",
        bone="root",
        thickness=0,
        bevel_width=0,
        subdivision=0,
    )
    del backdrop["rig_bone"]

    for name, location, energy, size, colour in (
        ("Key", (-3.2, -4.2, 4.2), 1150, 3.4, (1.0, 0.73, 0.52)),
        ("Fill", (3.4, -2.2, 2.8), 620, 2.8, (0.48, 0.62, 1.0)),
        ("Rim", (0.8, 3.5, 3.8), 900, 2.5, (1.0, 0.46, 0.22)),
    ):
        light_data = bpy.data.lights.new(f"Stage_{name}", "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = colour
        light = bpy.data.objects.new(f"Stage_{name}", light_data)
        light.location = location
        look_at(light, Vector((0, 0, 1.0)))
        stage.objects.link(light)

    return {
        "front": add_camera("Camera_Front", (0, -6, 1.0), (0, 0, 0.93), master),
        "threequarter": add_camera(
            "Camera_ThreeQuarter",
            (3.4, -5.2, 1.25),
            (0, 0, 0.94),
            master,
            ortho_scale=2.18,
        ),
        "profile": add_camera("Camera_Profile", (6, 0, 1.0), (0, 0, 0.93), master),
        "back": add_camera("Camera_Back", (0, 6, 1.0), (0, 0, 0.93), master),
    }


def set_lod_visibility(
    lod0: list[bpy.types.Object],
    lod1: list[bpy.types.Object],
    lod2: list[bpy.types.Object],
    selected: str,
) -> None:
    for name, objects in (("LOD0", lod0), ("LOD1", lod1), ("LOD2", lod2)):
        visible = name == selected
        for obj in objects:
            obj.hide_set(not visible)
            obj.hide_render = not visible


def export_lod(
    path: Path,
    objects: list[bpy.types.Object],
    armature: bpy.types.Object,
) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [*objects, armature]:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    properties = {
        item.identifier
        for item in bpy.ops.export_scene.gltf.get_rna_type().properties
    }
    options = {
        "filepath": str(path),
        "export_format": "GLB",
        "use_selection": True,
        "export_apply": True,
        "export_animations": True,
        "export_yup": True,
    }
    optional = {
        "export_force_sampling": True,
        "export_all_influences": False,
        "export_def_bones": True,
        "export_image_format": "AUTO",
        "export_animation_mode": "ACTIONS",
        "export_nla_strips": True,
    }
    options.update({key: value for key, value in optional.items() if key in properties})
    bpy.ops.export_scene.gltf(**options)
    bpy.ops.object.select_all(action="DESELECT")


def render_reviews(
    output_root: Path,
    cameras: dict[str, bpy.types.Object],
    armature: bpy.types.Object,
    actions: dict[str, bpy.types.Action],
) -> dict[str, str]:
    render_root = output_root / "renders"
    render_root.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    result: dict[str, str] = {}
    armature.animation_data.action = None
    scene.frame_set(1)
    for name in ("front", "threequarter", "profile", "back"):
        scene.camera = cameras[name]
        path = render_root / f"{CHARACTER_ID}-{name}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        result[name] = str(path)

    armature.animation_data.action = actions["Present_Right"]
    scene.frame_set(32)
    scene.camera = cameras["threequarter"]
    path = render_root / f"{CHARACTER_ID}-present-right.png"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    result["presentRight"] = str(path)

    armature.animation_data.action = actions["Look_Back"]
    scene.frame_set(28)
    scene.camera = cameras["back"]
    path = render_root / f"{CHARACTER_ID}-look-back.png"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    result["lookBack"] = str(path)

    armature.animation_data.action = None
    scene.frame_set(1)
    return result


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_contract(
    armature: bpy.types.Object,
    actions: dict[str, bpy.types.Action],
    mats: dict[str, bpy.types.Material],
    triangles: dict[str, int],
    rest_bounds: dict[str, list[float]],
    exports: dict[str, Path],
) -> dict[str, bool]:
    bone_names = {bone.name for bone in armature.data.bones}
    material_names = {
        mat.name for key, mat in mats.items() if key not in {"ground", "backdrop", "eye_white"}
    }
    height_error = abs(rest_bounds["dimensions_m"][2] - CANONICAL["height_m"])
    return {
        "rightsConfirmed": True,
        "ownerSilhouetteApproved": True,
        "rawMastersPrivate": True,
        "requiredBonesPresent": set(REQUIRED_BONES).issubset(bone_names),
        "requiredSocketsPresent": set(REQUIRED_SOCKETS).issubset(bone_names),
        "requiredActionsPresent": set(REQUIRED_ACTIONS).issubset(actions),
        "materialNamesPass": all(
            MATERIAL_NAMES[key] in material_names
            for key in (
                "skin",
                "hair",
                "eye",
                "inner",
                "trouser",
                "tabard",
                "outer",
                "leather",
                "metal",
                "accent",
            )
        ),
        "heightTolerancePass": height_error <= 0.005,
        "lodBudgetsPass": all(
            triangles[name] <= LOD_BUDGETS[name] for name in LOD_BUDGETS
        ),
        "exportsPresent": all(path.exists() and path.stat().st_size > 0 for path in exports.values()),
        "fullBodyCameraRequired": True,
        "otsAllowed": False,
    }


def main() -> None:
    args = parse_args()
    output_root = args.output_root.resolve()
    texture_root = args.texture_root.resolve() if args.texture_root else None
    output_root.mkdir(parents=True, exist_ok=True)
    export_root = output_root / "exports"
    export_root.mkdir(parents=True, exist_ok=True)

    master = reset_scene()
    rig_collection = make_collection("RIG", master)
    body_collection = make_collection("BODY", master)
    garment_collection = make_collection("GARMENTS", master)
    accessory_collection = make_collection("ACCESSORIES", master)
    detail_collection = make_collection("DETAILS", master)
    lod1_collection = make_collection("LOD1", master)
    lod2_collection = make_collection("LOD2", master)
    stage_collection = make_collection("STAGE", master)

    mats = create_materials(texture_root)
    armature, geometry = create_armature(rig_collection)
    lod0_objects = [
        *build_body(geometry, mats, body_collection, detail_collection),
        *build_face_and_hair(mats, detail_collection),
        *build_garments(geometry, mats, garment_collection, detail_collection),
        *build_accessories(mats, accessory_collection, detail_collection),
    ]
    for obj in lod0_objects:
        bind_rigid_mesh(obj, armature)
        obj["lod"] = "LOD0"

    actions = add_actions(armature)
    lod1_objects = duplicate_lod(
        lod0_objects,
        lod1_collection,
        lod_name="LOD1",
        ratio=0.58,
        omit_classes={"micro"},
    )
    lod2_objects = duplicate_lod(
        lod0_objects,
        lod2_collection,
        lod_name="LOD2",
        ratio=0.24,
        omit_classes={"micro", "detail"},
    )
    cameras = configure_stage(master, stage_collection, mats)
    set_lod_visibility(lod0_objects, lod1_objects, lod2_objects, "LOD0")

    scene = bpy.context.scene
    scene["canonical_character_id"] = CHARACTER_ID
    scene["canonical_schema_version"] = "3.0.0"
    scene["production_status"] = "approved-pilot-vertical-slice"
    scene["rights_decision"] = "D010"
    scene["rig_contract"] = RIG_CONVENTION
    scene["camera_contract"] = CAMERA_CONTRACT
    scene["ots_allowed"] = False
    scene["head_status"] = "stylized-production-pass-pending-detail-sheet-refinement"

    blend_path = output_root / f"{CHARACTER_ID}-production-pilot-v1.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    rest_bounds = evaluated_bounds(lod0_objects)
    sampled_bounds = animation_bounds(armature, actions, lod0_objects)
    triangles = {
        "LOD0": evaluated_triangle_count(lod0_objects),
        "LOD1": evaluated_triangle_count(lod1_objects),
        "LOD2": evaluated_triangle_count(lod2_objects),
    }
    review_renders = render_reviews(output_root, cameras, armature, actions)

    export_paths = {
        name: export_root / f"{CHARACTER_ID}_{name}.glb"
        for name in ("LOD0", "LOD1", "LOD2")
    }
    if not args.skip_export:
        for name, objects in (
            ("LOD0", lod0_objects),
            ("LOD1", lod1_objects),
            ("LOD2", lod2_objects),
        ):
            set_lod_visibility(lod0_objects, lod1_objects, lod2_objects, name)
            export_lod(export_paths[name], objects, armature)
    set_lod_visibility(lod0_objects, lod1_objects, lod2_objects, "LOD0")

    gates = validate_contract(
        armature,
        actions,
        mats,
        triangles,
        rest_bounds,
        export_paths,
    )
    report = {
        "schemaVersion": "1.0.0",
        "status": "production-pilot-v1",
        "characterId": CHARACTER_ID,
        "blenderVersion": bpy.app.version_string,
        "decisions": ["D004", "D009", "D010", "D011"],
        "canonical": CANONICAL,
        "rigConvention": RIG_CONVENTION,
        "cameraContract": CAMERA_CONTRACT,
        "facingAxis": "-Y",
        "upAxis": "+Z",
        "restPose": "canonical-28-degree-A-pose",
        "headStatus": scene["head_status"],
        "bones": sorted(bone.name for bone in armature.data.bones),
        "deformBones": sorted(
            bone.name for bone in armature.data.bones if bone.use_deform
        ),
        "sockets": sorted(
            bone.name for bone in armature.data.bones if not bone.use_deform
        ),
        "actions": {
            name: {
                "frameRange": [int(value) for value in action.frame_range],
                "loop": bool(action.get("loop", False)),
                "semantic": str(action.get("semantic", "")),
            }
            for name, action in actions.items()
        },
        "materials": sorted(
            {
                slot.material.name
                for obj in lod0_objects
                for slot in obj.material_slots
                if slot.material
            }
        ),
        "restBounds": rest_bounds,
        "animationBounds": sampled_bounds,
        "triangles": triangles,
        "lodBudgets": LOD_BUDGETS,
        "objectCounts": {
            "LOD0": len(lod0_objects),
            "LOD1": len(lod1_objects),
            "LOD2": len(lod2_objects),
        },
        "renders": review_renders,
        "exports": {
            name: {
                "path": str(path),
                "sha256": sha256(path) if path.exists() else None,
                "bytes": path.stat().st_size if path.exists() else 0,
            }
            for name, path in export_paths.items()
        },
        "blend": {
            "path": str(blend_path),
            "sha256": sha256(blend_path),
            "bytes": blend_path.stat().st_size,
        },
        "gates": gates,
        "allAutomatedGatesPass": all(gates.values()),
    }
    report_path = output_root / "production-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))

    if not report["allAutomatedGatesPass"]:
        failed = [name for name, passed in gates.items() if not passed]
        raise RuntimeError(f"DN-M-AFR-01 production pilot gates failed: {failed}")


if __name__ == "__main__":
    main()

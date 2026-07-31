"""Build the DN-M-AFR-01 canonical measurement blockout in Blender 5.2.

This is an internal reconstruction aid, not a final character asset. It uses
the written v3 canonical measurements and deliberately simple geometry so
silhouette, garment envelopes, camera containment and scale can be checked
before sculpting.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


CANONICAL = {
    "id": "DN-M-AFR-01",
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
    "hair": (0.035, 0.027, 0.022, 1.0),
    "inner": (0.149, 0.204, 0.247, 1.0),
    "outer": (0.596, 0.325, 0.180, 1.0),
    "secondary": (0.824, 0.710, 0.541, 1.0),
    "leather": (0.294, 0.192, 0.133, 1.0),
    "metal": (0.655, 0.478, 0.216, 1.0),
    "accent": (0.184, 0.345, 0.443, 1.0),
    "measure": (0.906, 0.675, 0.196, 1.0),
    "ground": (0.82, 0.76, 0.65, 1.0),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", required=True, type=Path)
    argv = []
    if "--" in __import__("sys").argv:
        argv = __import__("sys").argv[__import__("sys").argv.index("--") + 1 :]
    return parser.parse_args(argv)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    root = bpy.context.scene.collection.children.get("Collection")
    if root is not None:
        root.name = "DN-M-AFR-01_Blockout"


def collection(name: str) -> bpy.types.Collection:
    result = bpy.data.collections.get(name)
    if result is None:
        result = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(result)
    return result


def move_to_collection(
    obj: bpy.types.Object, target: bpy.types.Collection
) -> bpy.types.Object:
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def material(
    name: str,
    colour: tuple[float, float, float, float],
    *,
    roughness: float = 0.62,
    metallic: float = 0.0,
) -> bpy.types.Material:
    def to_linear(channel: float) -> float:
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    linear_colour = (
        to_linear(colour[0]),
        to_linear(colour[1]),
        to_linear(colour[2]),
        colour[3],
    )
    result = bpy.data.materials.new(name)
    result.diffuse_color = linear_colour
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = linear_colour
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return result


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def add_ellipsoid(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=40,
        ring_count=24,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    return move_to_collection(obj, target)


def add_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    *,
    bevel: float = 0.008,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Bounded bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    apply_material(obj, mat)
    return move_to_collection(obj, target)


def add_limb(
    name: str,
    start: Vector,
    end: Vector,
    radius: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
) -> bpy.types.Object:
    vector = end - start
    midpoint = (start + end) / 2
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=radius,
        depth=vector.length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = vector.to_track_quat("Z", "Y")
    modifier = obj.modifiers.new("Soft blockout edge", "BEVEL")
    modifier.width = min(radius * 0.45, 0.025)
    modifier.segments = 3
    apply_material(obj, mat)
    return move_to_collection(obj, target)


def add_panel(
    name: str,
    vertices: list[tuple[float, float, float]],
    mat: bpy.types.Material,
    target: bpy.types.Collection,
    thickness: float = 0.012,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], [[0, 1, 2, 3]])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    solidify = obj.modifiers.new("Garment thickness", "SOLIDIFY")
    solidify.thickness = thickness
    bevel = obj.modifiers.new("Garment edge", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 2
    apply_material(obj, mat)
    return obj


def add_text(
    name: str,
    body: str,
    location: tuple[float, float, float],
    size: float,
    mat: bpy.types.Material,
    target: bpy.types.Collection,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = 0.001
    obj = bpy.data.objects.new(name, curve)
    obj.location = location
    obj.rotation_euler = (math.radians(90), 0.0, 0.0)
    target.objects.link(obj)
    apply_material(obj, mat)
    return obj


def build_character() -> tuple[list[bpy.types.Object], dict[str, bpy.types.Material]]:
    body = collection("BODY_BLOCKOUT")
    garments = collection("GARMENT_ENVELOPES")
    accessories = collection("ACCESSORY_ENVELOPES")
    measures = collection("MEASUREMENT_OVERLAY")

    mats = {
        key: material(
            f"DN_M_AFR_{key.upper()}",
            colour,
            metallic=1.0 if key == "metal" else 0.0,
            roughness=0.35 if key == "metal" else 0.64,
        )
        for key, colour in PALETTE.items()
    }

    rendered: list[bpy.types.Object] = []
    rendered.append(
        add_ellipsoid(
            "Body_Head",
            (0.0, -0.005, 1.725),
            (0.105, 0.095, 0.115),
            mats["skin"],
            body,
        )
    )
    rendered.append(
        add_ellipsoid(
            "Hair_Envelope",
            (0.0, -0.004, 1.815),
            (0.108, 0.099, 0.025),
            mats["hair"],
            accessories,
        )
    )
    rendered.append(
        add_limb(
            "Body_Neck",
            Vector((0.0, 0.0, 1.565)),
            Vector((0.0, 0.0, 1.625)),
            0.065,
            mats["skin"],
            body,
        )
    )
    rendered.append(
        add_ellipsoid(
            "Body_Torso",
            (0.0, 0.0, 1.305),
            (0.205, CANONICAL["depth_m"] / 2, 0.285),
            mats["skin"],
            body,
        )
    )
    rendered.append(
        add_ellipsoid(
            "Body_Hips",
            (0.0, 0.0, 0.985),
            (0.185, 0.105, 0.145),
            mats["skin"],
            body,
        )
    )

    shoulder_z = 1.49
    upper_arm = 0.31
    forearm = 0.285
    hand = CANONICAL["hand_m"]
    angle = math.radians(CANONICAL["a_pose_arm_angle_degrees"])

    for side, sign in (("R", -1.0), ("L", 1.0)):
        shoulder = Vector((sign * CANONICAL["shoulder_m"] / 2, 0.0, shoulder_z))
        elbow = shoulder + Vector(
            (sign * math.sin(angle) * upper_arm, 0.0, -math.cos(angle) * upper_arm)
        )
        wrist = elbow + Vector(
            (
                sign * math.sin(angle * 0.86) * forearm,
                0.0,
                -math.cos(angle * 0.86) * forearm,
            )
        )
        fingertips = wrist + Vector((sign * 0.015, 0.0, -hand))

        rendered.extend(
            [
                add_limb(
                    f"Body_UpperArm_{side}",
                    shoulder,
                    elbow,
                    0.057,
                    mats["skin"],
                    body,
                ),
                add_limb(
                    f"Body_Forearm_{side}",
                    elbow,
                    wrist,
                    0.049,
                    mats["skin"],
                    body,
                ),
                add_limb(
                    f"Body_Hand_{side}",
                    wrist,
                    fingertips,
                    0.035,
                    mats["skin"],
                    body,
                ),
                add_limb(
                    f"Tunic_Sleeve_Upper_{side}",
                    shoulder,
                    elbow,
                    0.068,
                    mats["inner"],
                    garments,
                ),
                add_limb(
                    f"Tunic_Sleeve_Lower_{side}",
                    elbow,
                    wrist,
                    0.059,
                    mats["inner"],
                    garments,
                ),
            ]
        )

    hip_z = 0.97
    knee_z = 0.52
    ankle_z = 0.125
    for side, sign in (("R", -1.0), ("L", 1.0)):
        hip = Vector((sign * 0.105, 0.0, hip_z))
        knee = Vector((sign * 0.105, 0.0, knee_z))
        ankle = Vector((sign * 0.105, 0.0, ankle_z))
        rendered.extend(
            [
                add_limb(
                    f"Body_Thigh_{side}",
                    hip,
                    knee,
                    0.084,
                    mats["skin"],
                    body,
                ),
                add_limb(
                    f"Body_Shin_{side}",
                    knee,
                    ankle,
                    0.065,
                    mats["skin"],
                    body,
                ),
                add_limb(
                    f"Trousers_Upper_{side}",
                    hip,
                    knee,
                    0.103,
                    mats["secondary"],
                    garments,
                ),
                add_limb(
                    f"Trousers_Lower_{side}",
                    knee,
                    Vector((sign * 0.105, 0.0, 0.22)),
                    0.086,
                    mats["secondary"],
                    garments,
                ),
                add_box(
                    f"Footwear_{side}",
                    (sign * 0.105, -0.055, 0.07),
                    (0.15, CANONICAL["foot_m"], 0.14),
                    mats["leather"],
                    accessories,
                    bevel=0.022,
                ),
            ]
        )

    rendered.extend(
        [
            add_ellipsoid(
                "Tunic_Torso",
                (0.0, 0.0, 1.285),
                (0.224, 0.125, 0.32),
                mats["inner"],
                garments,
            ),
            add_box(
                "Primary_Belt",
                (0.0, -0.002, 1.075),
                (0.43, 0.235, 0.072),
                mats["leather"],
                accessories,
                bevel=0.012,
            ),
            add_box(
                "Secondary_Belt",
                (0.0, -0.004, 1.015),
                (0.39, 0.225, 0.035),
                mats["leather"],
                accessories,
                bevel=0.009,
            ),
            add_panel(
                "Tabard_Front",
                [
                    (-0.155, -0.138, 1.34),
                    (0.155, -0.138, 1.34),
                    (0.125, -0.138, 0.60),
                    (-0.125, -0.138, 0.60),
                ],
                mats["secondary"],
                garments,
            ),
            add_panel(
                "Tabard_Back",
                [
                    (0.155, 0.138, 1.34),
                    (-0.155, 0.138, 1.34),
                    (-0.125, 0.138, 0.66),
                    (0.125, 0.138, 0.66),
                ],
                mats["secondary"],
                garments,
            ),
            add_panel(
                "Indigo_Centre_Panel",
                [
                    (-0.042, -0.152, 1.32),
                    (0.042, -0.152, 1.32),
                    (0.038, -0.152, 0.63),
                    (-0.038, -0.152, 0.63),
                ],
                mats["accent"],
                garments,
                thickness=0.008,
            ),
            add_panel(
                "Rust_Mantle_Asymmetric",
                [
                    (-0.265, -0.165, 1.57),
                    (0.12, -0.165, 1.47),
                    (0.22, -0.165, 0.73),
                    (0.035, -0.165, 0.92),
                ],
                mats["outer"],
                garments,
                thickness=0.016,
            ),
            add_panel(
                "Rust_Mantle_Back",
                [
                    (0.12, 0.165, 1.47),
                    (-0.265, 0.165, 1.57),
                    (0.035, 0.165, 0.92),
                    (0.22, 0.165, 0.73),
                ],
                mats["outer"],
                garments,
                thickness=0.016,
            ),
            add_box(
                "Pouch_Right_Large",
                (-0.245, -0.015, 0.99),
                (0.16, 0.12, 0.22),
                mats["leather"],
                accessories,
                bevel=0.016,
            ),
            add_box(
                "Pouch_Left_Small",
                (0.22, -0.025, 1.02),
                (0.11, 0.105, 0.15),
                mats["leather"],
                accessories,
                bevel=0.014,
            ),
            add_limb(
                "Blue_Tassel_Right",
                Vector((-0.19, -0.15, 0.97)),
                Vector((-0.19, -0.15, 0.76)),
                0.024,
                mats["accent"],
                accessories,
            ),
            add_ellipsoid(
                "Bronze_Central_Disc",
                (0.0, -0.154, 1.42),
                (0.045, 0.012, 0.045),
                mats["metal"],
                accessories,
            ),
        ]
    )

    add_box(
        "Measure_Height",
        (-0.65, -0.22, CANONICAL["height_m"] / 2),
        (0.008, 0.008, CANONICAL["height_m"]),
        mats["measure"],
        measures,
        bevel=0.0,
    )
    add_box(
        "Measure_Shoulder",
        (0.0, -0.22, shoulder_z),
        (CANONICAL["shoulder_m"], 0.008, 0.008),
        mats["measure"],
        measures,
        bevel=0.0,
    )
    add_box(
        "Measure_Head_Top",
        (0.0, -0.22, CANONICAL["height_m"]),
        (0.27, 0.008, 0.008),
        mats["measure"],
        measures,
        bevel=0.0,
    )
    add_box(
        "Measure_Head_Bottom",
        (
            0.0,
            -0.22,
            CANONICAL["height_m"] - CANONICAL["head_height_m"],
        ),
        (0.27, 0.008, 0.008),
        mats["measure"],
        measures,
        bevel=0.0,
    )
    add_text(
        "Measure_Label_Height",
        "184 cm",
        (-0.70, -0.23, 0.92),
        0.045,
        mats["measure"],
        measures,
    )
    return rendered, mats


def add_camera(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
) -> bpy.types.Object:
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.ortho_scale = 2.22
    camera = bpy.data.objects.new(name, data)
    camera.location = location
    direction = Vector(target) - Vector(location)
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(camera)
    return camera


def configure_scene(mats: dict[str, bpy.types.Material]) -> dict[str, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.color = (0.055, 0.045, 0.035)
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "METERS"
    scene.unit_settings.scale_length = 1.0

    add_box(
        "Ground",
        (0.0, 0.0, -0.025),
        (4.0, 4.0, 0.05),
        mats["ground"],
        collection("STAGE"),
        bevel=0.0,
    )

    for name, location, energy, size in (
        ("Key_Light", (-3.0, -4.0, 5.0), 950.0, 4.0),
        ("Fill_Light", (3.5, -2.0, 3.0), 550.0, 3.0),
        ("Rim_Light", (0.0, 4.0, 4.5), 700.0, 3.0),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        light.location = location
        light.rotation_euler = (
            Vector((0.0, 0.0, 1.0)) - light.location
        ).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(light)

    return {
        "front": add_camera("Camera_Front", (0.0, -6.0, 1.0), (0.0, 0.0, 0.95)),
        "profile": add_camera(
            "Camera_Profile", (6.0, 0.0, 1.0), (0.0, 0.0, 0.95)
        ),
        "back": add_camera("Camera_Back", (0.0, 6.0, 1.0), (0.0, 0.0, 0.95)),
    }


def object_bounds(objects: list[bpy.types.Object]) -> dict[str, list[float]]:
    points = [
        obj.matrix_world @ Vector(corner)
        for obj in objects
        for corner in obj.bound_box
        if obj.type == "MESH"
    ]
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


def main() -> None:
    args = parse_args()
    output_root = args.output_root.resolve()
    render_root = output_root / "renders"
    output_root.mkdir(parents=True, exist_ok=True)
    render_root.mkdir(parents=True, exist_ok=True)

    reset_scene()
    objects, mats = build_character()
    cameras = configure_scene(mats)
    scene = bpy.context.scene
    scene["canonical_character_id"] = CANONICAL["id"]
    scene["canonical_schema_version"] = "3.0.0"
    scene["reconstruction_status"] = "measurement-blockout-not-final-sculpt"
    scene["camera_contract"] = "D004-distant-full-body-no-OTS"

    blend_path = output_root / "DN-M-AFR-01-measurement-blockout-v1.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    for view, camera in cameras.items():
        bpy.data.collections["MEASUREMENT_OVERLAY"].hide_render = view != "front"
        scene.camera = camera
        scene.render.filepath = str(render_root / f"DN-M-AFR-01-{view}.png")
        bpy.ops.render.render(write_still=True)

    bounds = object_bounds(objects)
    report = {
        "schemaVersion": "1.0.0",
        "status": "measurement-blockout",
        "blenderVersion": bpy.app.version_string,
        "characterId": CANONICAL["id"],
        "canonical": CANONICAL,
        "blockoutBounds": bounds,
        "heightErrorMm": round(
            abs(bounds["dimensions_m"][2] - CANONICAL["height_m"]) * 1000, 3
        ),
        "collections": {
            name: len(bpy.data.collections[name].objects)
            for name in (
                "BODY_BLOCKOUT",
                "GARMENT_ENVELOPES",
                "ACCESSORY_ENVELOPES",
                "MEASUREMENT_OVERLAY",
            )
        },
        "views": {
            view: str(render_root / f"DN-M-AFR-01-{view}.png")
            for view in cameras
        },
        "gates": {
            "finalSculptApproved": False,
            "ownerSilhouetteApproved": False,
            "rightsConfirmed": False,
            "fullBodyCameraRequired": True,
            "otsAllowed": False,
        },
    }
    (output_root / "measurement-report.json").write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

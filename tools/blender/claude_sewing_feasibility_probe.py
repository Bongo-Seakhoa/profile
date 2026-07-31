"""Headless feasibility test: pattern-and-sew cloth drape in Blender 5.2.

Builds a front and back panel around a torso collider, joins them with loose
sewing edges, pins the shoulder line, and bakes a drape. Reports wall time,
whether the panels actually wrapped, and whether the result is reproducible.
"""

import sys
import time

import bmesh
import bpy
from mathutils import Vector

RES = int(sys.argv[sys.argv.index("--res") + 1]) if "--res" in sys.argv else 40
FRAMES = int(sys.argv[sys.argv.index("--frames") + 1]) if "--frames" in sys.argv else 60
SEW = "--nosew" not in sys.argv
STIFF = float(sys.argv[sys.argv.index("--stiff") + 1]) if "--stiff" in sys.argv else 15.0
SEPARATION = float(sys.argv[sys.argv.index("--sep") + 1]) if "--sep" in sys.argv else 0.16

# Clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = FRAMES
scene.unit_settings.system = "METRIC"

# --- Torso collider: capsule-ish body proxy, roughly human chest scale ---
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.17, depth=0.62, location=(0, 0, 1.25))
body = bpy.context.object
body.name = "BodyProxy"
body.scale = (1.0, 0.62, 1.0)  # elliptical cross-section like a ribcage
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.modifier_add(type="COLLISION")
body.collision.thickness_outer = 0.005

# --- Two flat panels, offset front and back of the body ---
def make_panel(name, y):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    bm = bmesh.new()
    verts = []
    for r in range(RES):
        row = []
        for c in range(RES):
            u = c / (RES - 1)
            v = r / (RES - 1)
            x = (u - 0.5) * 0.42
            z = 1.60 - v * 0.72
            row.append(bm.verts.new((x, y, z)))
        verts.append(row)
    bm.verts.ensure_lookup_table()
    for r in range(RES - 1):
        for c in range(RES - 1):
            bm.faces.new((verts[r][c], verts[r][c + 1], verts[r + 1][c + 1], verts[r + 1][c]))
    bm.to_mesh(mesh)
    bm.free()
    return obj, verts


front, _ = make_panel("Panel_Front", -SEPARATION)
back, _ = make_panel("Panel_Back", SEPARATION)

# --- Join into one object, then add loose SEWING edges down both sides ---
bpy.ops.object.select_all(action="DESELECT")
front.select_set(True)
back.select_set(True)
bpy.context.view_layer.objects.active = front
bpy.ops.object.join()
garment = bpy.context.object
garment.name = "Garment"

bm = bmesh.new()
bm.from_mesh(garment.data)
bm.verts.ensure_lookup_table()

# left/right border verts of each panel, matched by row
n = RES * RES
sewn = 0
SEAM_PAIRS = []
for r in range(RES):
    for (a_idx, b_idx) in (
        (r * RES + 0, n + r * RES + 0),              # left seam
        (r * RES + (RES - 1), n + r * RES + (RES - 1)),  # right seam
    ):
        try:
            bm.edges.new((bm.verts[a_idx], bm.verts[b_idx]))
            SEAM_PAIRS.append((a_idx, b_idx))
            sewn += 1
        except ValueError:
            pass
bm.to_mesh(garment.data)
bm.free()

# --- Pin group: top row of both panels (the shoulder line) ---
pin = garment.vertex_groups.new(name="Pin")
top_rows = [i for i in range(RES)] + [n + i for i in range(RES)]
pin.add(top_rows, 1.0, "REPLACE")

# --- Cloth with sewing springs ---
cloth = garment.modifiers.new("Cloth", "CLOTH")
cs = cloth.settings
cs.quality = 5
cs.mass = 0.30
cs.use_sewing_springs = SEW
cs.sewing_force_max = 0.0          # unlimited pull until seams meet
cs.vertex_group_mass = "Pin"
cs.pin_stiffness = 1.0
cs.tension_stiffness = STIFF
cs.compression_stiffness = STIFF
cs.shear_stiffness = 5
cs.bending_stiffness = 0.5
cloth.collision_settings.use_self_collision = True
cloth.collision_settings.self_distance_min = 0.003
cloth.collision_settings.distance_min = 0.004

before = garment.dimensions.y

# --- Bake ---
t0 = time.time()
for f in range(scene.frame_start, scene.frame_end + 1):
    scene.frame_set(f)
elapsed = time.time() - t0

deps = bpy.context.evaluated_depsgraph_get()
evaluated = garment.evaluated_get(deps)
final = evaluated.to_mesh()
xs = [v.co.x for v in final.vertices]
ys = [v.co.y for v in final.vertices]
zs = [v.co.z for v in final.vertices]
depth = max(ys) - min(ys)
width = max(xs) - min(xs)
drop = 1.60 - min(zs)

# fold detection: silhouette variation around the body at mid-height
mid = [v.co for v in final.vertices if 1.05 < v.co.z < 1.15]
radii = sorted(Vector((c.x, c.y)).length for c in mid)
radial_spread = (radii[-1] - radii[0]) if len(radii) > 2 else 0.0

unpinned = [v.co for v in final.vertices if v.co.z < 1.50]
uy = [c.y for c in unpinned]
unpinned_depth = (max(uy) - min(uy)) if uy else 0.0
gaps = [(final.vertices[a].co - final.vertices[b].co).length for a, b in SEAM_PAIRS]
lower_gaps = [(final.vertices[a].co - final.vertices[b].co).length
              for a, b in SEAM_PAIRS if final.vertices[a].co.z < 1.50]
print("RESULT_UNPINNED_DEPTH %.4f" % unpinned_depth)
print("RESULT_SEAMGAP_MEAN_MM %.1f" % (1000.0 * sum(gaps) / max(len(gaps), 1)))
print("RESULT_SEAMGAP_LOWER_MM %.1f" % (1000.0 * sum(lower_gaps) / max(len(lower_gaps), 1)))
print("RESULT_SEAMGAP_START_MM %.1f" % (2000.0 * SEPARATION))
print("RESULT_CONFIG sew=%s stiff=%.1f sep=%.2f frames=%d" % (SEW, STIFF, SEPARATION, FRAMES))
print("RESULT_VERTS %d" % len(final.vertices))
print("RESULT_SEWN_EDGES %d" % sewn)
print("RESULT_SECONDS %.1f" % elapsed)
print("RESULT_DEPTH_BEFORE %.4f" % before)
print("RESULT_DEPTH_AFTER %.4f" % depth)
print("RESULT_WIDTH_AFTER %.4f" % width)
print("RESULT_DROP %.4f" % drop)
print("RESULT_RADIAL_SPREAD_MM %.1f" % (radial_spread * 1000.0))
checksum = sum(round(v.co.x + v.co.y * 3.0 + v.co.z * 7.0, 5) for v in final.vertices)
print("RESULT_CHECKSUM %.5f" % checksum)
evaluated.to_mesh_clear()

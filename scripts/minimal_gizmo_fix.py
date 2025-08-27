#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# The real issue: When clicking gizmo with geometry behind, the geometry gets picked instead
# Solution: Make gizmo meshes have isPickable = false for OTHER picking operations
# But keep them pickable for the gizmo's own picking

# Find where gizmo meshes are created and add exclusion flag
# Look for where we set mesh.isGizmo = true and add a picking exclusion

# Pattern 1: Axis meshes
old_axis_tag = """            [line, arrow, hitBox].forEach(mesh => {
                mesh.gizmoHandle = handle;
                mesh.isGizmo = true;
                mesh.renderingGroupId = 3; // Highest priority for gizmos
            });"""

new_axis_tag = """            [line, arrow, hitBox].forEach(mesh => {
                mesh.gizmoHandle = handle;
                mesh.isGizmo = true;
                mesh.renderingGroupId = 3; // Highest priority for gizmos
                // CRITICAL: Exclude from general picking but not gizmo picking
                mesh.excludeFromPicking = true;  // Other systems should ignore this
            });"""

if old_axis_tag in content:
    content = content.replace(old_axis_tag, new_axis_tag)
    print("Fixed axis mesh picking exclusion")

# Now modify the part clicking system to respect this exclusion
# Find where parts are clicked (around line 10000)
old_part_pick = """        // Check if we clicked on a part
        const pickInfo = this.scene.pick(
            this.scene.pointerX, 
            this.scene.pointerY,
            (mesh) => {
                // Only pick meshes that have partData
                return mesh && mesh.partData;
            }
        );"""

new_part_pick = """        // Check if we clicked on a part
        const pickInfo = this.scene.pick(
            this.scene.pointerX, 
            this.scene.pointerY,
            (mesh) => {
                // Only pick meshes that have partData AND are not gizmo meshes
                return mesh && mesh.partData && !mesh.isGizmo;
            }
        );"""

if old_part_pick in content:
    content = content.replace(old_part_pick, new_part_pick)
    print("Fixed part picking to exclude gizmos")
else:
    # Try simpler pattern
    simple_pattern = "return mesh && mesh.partData;"
    if simple_pattern in content:
        content = content.replace(
            simple_pattern,
            "return mesh && mesh.partData && !mesh.isGizmo;"
        )
        print("Fixed part picking (simple pattern)")

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Minimal picking fix applied")
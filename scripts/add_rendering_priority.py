#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Fix 1: Add renderingGroupId to axis handle meshes
old_axis_tag = """            // Tag meshes
            [line, arrow, hitBox].forEach(mesh => {
                mesh.gizmoHandle = handle;
                mesh.isGizmo = true;
            });"""

new_axis_tag = """            // Tag meshes
            [line, arrow, hitBox].forEach(mesh => {
                mesh.gizmoHandle = handle;
                mesh.isGizmo = true;
                mesh.renderingGroupId = 3; // Highest priority for gizmos
            });"""

# Replace axis tagging
if old_axis_tag in content:
    content = content.replace(old_axis_tag, new_axis_tag)
    print("Added renderingGroupId to axis handles")
else:
    print("Warning: Could not find axis tagging code")

# Fix 2: Add renderingGroupId to plane handles
old_plane_tag = """            planeMesh.material = material;
            planeMesh.isGizmo = true;
            planeMesh.gizmoHandle = handle;
            planeMesh.isPickable = true;"""

new_plane_tag = """            planeMesh.material = material;
            planeMesh.isGizmo = true;
            planeMesh.gizmoHandle = handle;
            planeMesh.isPickable = true;
            planeMesh.renderingGroupId = 3; // Highest priority for gizmos"""

# Replace plane tagging
if old_plane_tag in content:
    content = content.replace(old_plane_tag, new_plane_tag)
    print("Added renderingGroupId to plane handles")
else:
    # Try alternate pattern
    old_plane_alt = """            planeMesh.isGizmo = true;
            planeMesh.gizmoHandle = handle;"""
    
    new_plane_alt = """            planeMesh.isGizmo = true;
            planeMesh.gizmoHandle = handle;
            planeMesh.renderingGroupId = 3; // Highest priority for gizmos"""
    
    if old_plane_alt in content:
        content = content.replace(old_plane_alt, new_plane_alt)
        print("Added renderingGroupId to plane handles (alternate)")
    else:
        print("Warning: Could not find plane tagging code")

# Fix 3: Add renderingGroupId to center sphere
old_center = """        this.centerSphere.isGizmo = true;
        this.centerSphere.gizmoHandle = {"""

new_center = """        this.centerSphere.isGizmo = true;
        this.centerSphere.renderingGroupId = 3; // Highest priority for gizmos
        this.centerSphere.gizmoHandle = {"""

# Replace center sphere
if old_center in content:
    content = content.replace(old_center, new_center)
    print("Added renderingGroupId to center sphere")
else:
    print("Warning: Could not find center sphere code")

# Write the fixed content
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Rendering priority fixes applied")
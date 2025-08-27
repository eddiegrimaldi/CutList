#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Add a simple boolean flag to DrawingWorld class
# Find where DrawingWorld constructor initializes things
init_pattern = "        this.scene = scene;"
if init_pattern in content:
    content = content.replace(
        init_pattern,
        init_pattern + "\n        this.gizmoHandledClick = false; // Simple flag to prevent click conflicts"
    )
    print("Added gizmoHandledClick flag")

# Make gizmo set the flag when it handles a click
old_gizmo_click = """            // We hit a gizmo handle, start dragging
            console.log("Gizmo handle clicked:", pickInfo.pickedMesh.name);
            this.startDrag(pickInfo.pickedMesh.gizmoHandle, pickInfo);"""

new_gizmo_click = """            // We hit a gizmo handle, start dragging
            console.log("Gizmo handle clicked:", pickInfo.pickedMesh.name);
            this.startDrag(pickInfo.pickedMesh.gizmoHandle, pickInfo);
            // Set flag so other systems know to ignore this click
            if (window.drawingWorld) {
                window.drawingWorld.gizmoHandledClick = true;
            }"""

if old_gizmo_click in content:
    content = content.replace(old_gizmo_click, new_gizmo_click)
    print("Gizmo now sets flag when clicked")

# Make part selection check the flag first
old_part_click = """    onPointerDown(pointerInfo) {
        if (pointerInfo.event.button !== 0) return; // Only left click"""

new_part_click = """    onPointerDown(pointerInfo) {
        // Check if gizmo already handled this click
        if (this.gizmoHandledClick) {
            this.gizmoHandledClick = false; // Reset flag
            return; // Don't process this click
        }
        if (pointerInfo.event.button !== 0) return; // Only left click"""

if old_part_click in content:
    content = content.replace(old_part_click, new_part_click)
    print("Part selection now checks flag")

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Simple boolean fix applied")
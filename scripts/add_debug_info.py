#!/usr/bin/env python3
"""Add minimal debug info to verify fixes are working"""

# Read the file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Add console log to startDrag to confirm it's being called
content = content.replace(
    'startDrag(handle, pickInfo) {',
    'startDrag(handle, pickInfo) {\n        console.log("GIZMO: Starting drag on", handle.axis || handle.type);'
)

# Add console log to updateDrag to see if distance is null
content = content.replace(
    'const distance = ray.intersectsPlane(this.dragPlane);',
    'const distance = ray.intersectsPlane(this.dragPlane);\n        console.log("GIZMO: Drag distance:", distance);'
)

# Add log to part selection
content = content.replace(
    'if (partPickInfo.hit && partPickInfo.pickedMesh && partPickInfo.pickedMesh.partData) {',
    'if (partPickInfo.hit && partPickInfo.pickedMesh && partPickInfo.pickedMesh.partData) {\n                    console.log("PART: Selecting part");'
)

# Add log to deselection
content = content.replace(
    'if (this.selectedPart) {\n                            this.deselectPart();',
    'if (this.selectedPart) {\n                            console.log("PART: Deselecting part on empty space click");\n                            this.deselectPart();'
)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Added minimal debug logging")
#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Remove ALL console.log statements related to gizmo and part selection
logging_to_remove = [
    "console.log('Part clicked - prepared for potential dragging');",
    "console.log('Gizmo handle clicked:', pickInfo.pickedMesh.name);",
    "console.log('Created modern gizmo for mesh:', mesh.name);",
    "console.log('Cleared all drag handles and gizmos');",
    "console.log('Deselecting part:', this.selectedPart);",
    "console.log('Selecting part:', part);",
    "console.log('Selection completed - no drag occurred');",
    "console.log('START DRAG - Handle:', handle, 'Target mesh:', this.targetMesh.name);",
    "console.log('Drag initialized - Start position:', this.dragStartPosition);",
    "console.log('SETUP DRAG PLANE - Handle type:', handle.type, 'Direction:', handle.direction);",
    "console.log('Drag plane created - Normal:', this.dragPlane.normal, 'D:', this.dragPlane.d);",
    "console.log('Empty space clicked, hiding gizmo');",
    "console.log('No valid intersection with drag plane, distance:', distance);"
]

for log_line in logging_to_remove:
    # Remove the line
    content = content.replace(log_line, "")
    # Also try with line ending
    content = content.replace(log_line + "\n", "")
    # Also try with semicolon and newline
    content = content.replace(log_line + ";\n", "")

# Also remove any SELECT DEBUG lines
content = re.sub(r'^\s*console\.log\([\'"]SELECT DEBUG:.*?\);\s*$', '', content, flags=re.MULTILINE)

# Remove MESH POSITION logging
content = re.sub(r'^\s*console\.log\([\'"]MESH POSITION.*?\);\s*$', '', content, flags=re.MULTILINE)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Removed all spam logging")
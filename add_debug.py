#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Add debug to handlePointerDown in ModernGizmoSystem
for i, line in enumerate(lines):
    if 'handlePointerDown(pointerInfo) {' in line and i < 500:
        lines.insert(i + 1, '        console.log("ModernGizmo handlePointerDown triggered", pointerInfo.event.button);\n')
        break

# Add debug to setupObservables
for i, line in enumerate(lines):
    if 'setupObservables() {' in line and i < 500:
        lines.insert(i + 1, '        console.log("ModernGizmo setupObservables called");\n')
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Debug logging added")

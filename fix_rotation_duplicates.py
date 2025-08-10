#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Comment out the problematic first rotation handler (lines 11004-11016)
for i in range(11003, 11016):
    if i < len(lines):
        # Comment out these lines
        if '// Override position updates during rotation' in lines[i]:
            lines[i] = '            // REMOVED: Duplicate rotation handlers that were causing conflicts\n'
        elif 'if (this.rotationGizmo.xGizmo && this.rotationGizmo.xGizmo.dragBehavior)' in lines[i] and i == 11004:
            lines[i] = '            // ' + lines[i]
        elif i >= 11005 and i <= 11015:
            lines[i] = '            // ' + lines[i]

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Removed duplicate rotation handlers")

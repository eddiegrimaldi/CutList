#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find the updateTransformDisplay method and fix it
for i, line in enumerate(lines):
    if 'updateTransformDisplay(value, type)' in line:
        # Look ahead for the problematic lines
        for j in range(i, min(i + 15, len(lines))):
            # Fix the position display line
            if 'this.transformDisplay.textContent = ' in lines[j] and 'Move:' in lines[j]:
                lines[j] = '            this.transformDisplay.textContent = "Move: X:" + x + "\" Y:" + y + "\" Z:" + z + "\"";\n'
            # Fix the rotation display line  
            elif 'this.transformDisplay.textContent = ' in lines[j] and 'Rotate:' in lines[j]:
                lines[j] = '            this.transformDisplay.textContent = "Rotate: X:" + xDeg + "° Y:" + yDeg + "° Z:" + zDeg + "°";\n'
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Fixed transform display text')

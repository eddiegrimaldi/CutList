#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find and fix the updateTransformDisplay method
for i, line in enumerate(lines):
    if 'updateTransformDisplay(value, type)' in line:
        # Look for the problematic lines in the next 20 lines
        for j in range(i, min(i + 20, len(lines))):
            if 'this.transformDisplay.textContent = "Move:' in lines[j]:
                # Fix position display
                lines[j] = '            this.transformDisplay.textContent = "Move: X:" + x + "\" Y:" + y + "\" Z:" + z + "\"";\n'
            elif 'if (type === "rotation")' in lines[j]:
                # Find rotation display line
                for k in range(j, min(j + 10, len(lines))):
                    if 'this.transformDisplay.textContent' in lines[k] and 'Move:' in lines[k]:
                        # This should be rotation display
                        lines[k] = '            this.transformDisplay.textContent = "Rotate: X:" + xDeg + "° Y:" + yDeg + "° Z:" + zDeg + "°";\n'
                        break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Fixed display text')

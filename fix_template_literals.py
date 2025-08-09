#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Fix the position display text
content = content.replace(
    'this.transformDisplay.textContent = ;',
    'this.transformDisplay.textContent = "Move: X:" + x + "\" Y:" + y + "\" Z:" + z + "\"";'
)

# Check for rotation display text issue too
if 'this.transformDisplay.textContent = ;' in content:
    # There might be another one for rotation
    content = content.replace(
        'this.transformDisplay.textContent = ;',
        'this.transformDisplay.textContent = "Rotate: X:" + xDeg + "° Y:" + yDeg + "° Z:" + zDeg + "°";',
        1  # Only replace the first remaining occurrence
    )

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Fixed template literals')

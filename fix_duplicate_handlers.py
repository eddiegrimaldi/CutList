#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Remove the entire duplicate block
import re

# Find and remove the duplicate rotation position override block
pattern = r'// Override position updates during rotation[\s\S]*?this\.rotationGizmo\._rootMesh\.position\.copyFrom\(rotationStartPosition\);[\s\S]*?\}\);[\s\S]*?\}'

content = re.sub(pattern, '// REMOVED: Duplicate rotation handlers that caused twitching', content)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print("Fixed duplicate handlers")

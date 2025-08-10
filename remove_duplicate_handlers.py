#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Comment out the duplicate rotation handlers (lines 10992-11004)
for i in range(10991, 11004):
    if i < len(lines):
        if not lines[i].strip().startswith('//'):
            lines[i] = '            // REMOVED DUPLICATE: ' + lines[i].lstrip()

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Removed duplicate rotation handlers")

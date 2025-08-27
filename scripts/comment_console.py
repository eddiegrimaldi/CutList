#!/usr/bin/env python3

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    lines = f.readlines()

# Comment out lines that start with console
result = []
for line in lines:
    stripped = line.lstrip()
    if stripped.startswith('console.'):
        result.append('// ' + line)
    else:
        result.append(line)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.writelines(result)

print("Commented out all console lines")
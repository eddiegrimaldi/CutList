#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Remove the console.log statements that fire every frame
logging_to_remove = [
    "            console.log('Found X axis meshes, xDir:', xDir);",
    "            console.log('Found Z axis meshes, zDir:', zDir);",
    "        console.log('Drag planes found:', { xy: !!xyPlane, xz: !!xzPlane, yz: !!yzPlane });"
]

for log_line in logging_to_remove:
    if log_line in content:
        content = content.replace(log_line + '\n', '')
        print(f"Removed: {log_line[:50]}...")

# Write the cleaned content
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Frame-based logging removed successfully")
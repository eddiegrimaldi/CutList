#!/usr/bin/env python3

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    lines = f.readlines()

# Remove only the specific logging lines that fire every frame
lines_to_remove = [687, 720, 751]  # Line numbers minus 1 for 0-based indexing

# Remove in reverse order to maintain line numbers
for line_num in sorted(lines_to_remove, reverse=True):
    if line_num < len(lines):
        # Check if it's a console.log line
        if 'console.log' in lines[line_num]:
            lines[line_num] = ''  # Empty the line instead of removing it

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Removed frame logging only")
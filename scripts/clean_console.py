#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    lines = f.readlines()

# Remove lines containing console.log, console.error, console.warn, console.debug
cleaned_lines = []
for line in lines:
    if not re.search(r'console\.(log|error|warn|debug)', line):
        cleaned_lines.append(line)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.writelines(cleaned_lines)

print("Removed all console debug lines")
#!/usr/bin/env python3
"""Remove debug console.log statements that could spam"""

# Read the file
with open('/var/www/html/drawing-world.js', 'r') as f:
    lines = f.readlines()

# Remove specific problematic logs
cleaned_lines = []
for i, line in enumerate(lines):
    # Skip these specific console.log lines
    if ("console.log('LEFT CLICK - sketch mode:" in line or
        "console.log('RECTANGLE TOOL DETECTED');" in line or
        "console.log('PICK RESULT:'," in line or
        "console.log('STARTING RECTANGLE DRAW');" in line or
        "console.log('- LEFT CLICK: Tools and picking ONLY');" in line):
        cleaned_lines.append("                // " + line.lstrip())  # Comment out instead of removing
    else:
        cleaned_lines.append(line)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.writelines(cleaned_lines)

print("Commented out debug console.log statements")
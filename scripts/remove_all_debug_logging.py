#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Remove all console.log statements from the gizmo system
patterns_to_remove = [
    r'^\s*console\.log\("SETUP DRAG PLANE.*?\);\s*\n',
    r'^\s*console\.log\("Target mesh position:.*?\);\s*\n',
    r'^\s*console\.log\("UPDATE DRAG.*?\);\s*\n',
    r'^\s*console\.log\("Drag initialized.*?\);\s*\n',
    r'^\s*console\.log\("START DRAG.*?\);\s*\n',
    r'^\s*console\.log\("Gizmo handle clicked:.*?\);\s*\n',
    r'^\s*console\.log\("Empty space clicked.*?\);\s*\n',
    r'^\s*console\.log\("Y-axis drag.*?\);\s*\n',
    r'^\s*console\.log\("Drag plane created.*?\);\s*\n',
    r'^\s*console\.log\("No valid intersection.*?\);\s*\n',
    r'^\s*console\.error\("No handle provided.*?\);\s*\n',
    r'^\s*console\.error\("No target mesh.*?\);\s*\n',
    # Also remove the debug block we just added
    r'\s*// Debug logging for Y-axis movement\s*\n\s*if \(this\.activeHandle && this\.activeHandle\.name === \'y\'\) \{\s*\n\s*console\.log\("Y-axis drag.*?\);\s*\n\s*\}',
]

for pattern in patterns_to_remove:
    content = re.sub(pattern, '', content, flags=re.MULTILINE)

print("Removed debug logging statements")

# Write the cleaned content
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("All debug logging removed")
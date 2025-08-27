#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Remove ALL console.log statements
content = re.sub(r'^\s*console\.log\(.*?\);\s*$', '', content, flags=re.MULTILINE)

# Also remove console.error, console.warn, console.debug
content = re.sub(r'^\s*console\.(error|warn|debug)\(.*?\);\s*$', '', content, flags=re.MULTILINE)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Removed ALL console statements")
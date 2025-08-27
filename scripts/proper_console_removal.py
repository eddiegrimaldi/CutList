#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Replace console statements with empty statement to preserve structure
content = re.sub(r'console\.(log|error|warn|debug)\([^;]*\);', ';', content)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Replaced all console statements with empty statements")
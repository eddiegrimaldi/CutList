#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Handle multiline console statements by matching everything including newlines
# Match console.xxx(...) including multiline content
pattern = r'console\.(log|error|warn|debug)\s*\([^)]*\)[;]?'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Safely removed console statements")
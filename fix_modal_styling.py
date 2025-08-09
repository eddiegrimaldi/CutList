#\!/usr/bin/env python3
import re

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Find and update the modal input field styling
# Update position input field
old_pattern1 = r'''<input type=number id=transform-value value= \+ value\.toFixed\(2\) \+  step=0.25 style=width: 80px

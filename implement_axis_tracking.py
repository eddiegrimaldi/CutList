#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Step 1: Add axis tracking variables after existing transform variables
tracking_vars = '''        this.currentDragAxis = null; // Track which axis: 'x', 'y', or 'z'
        this.dragStartValue = 0; // Initial value on the axis
'''

# Find where to insert (after transformType variable)
insert_pos = content.find(this.transformType = null

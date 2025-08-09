#\!/bin/bash

# Create a Python script on the server to add the initialization
cat > /tmp/add_transform_init.py << 'PYEOF'
#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find the createDragHandles function
for i, line in enumerate(lines):
    if 'createDragHandles(mesh) {' in line:
        # Insert after the console.log line (2 lines down)
        insert_pos = i + 2
        
        init_code = '''        // Initialize transform precision tracking
        this.transformStartPosition = null;
        this.transformStartRotation = null;
        this.ghostMesh = null;
        this.transformDisplay = null;
        this.transformType = null; // 'position' or 'rotation'
        this.gridSnapSize = 1; // 1 inch grid snap by default
        this.rotationSnapAngle = 15; // 15 degree snap by default
        
'''
        
        # Split and insert
        lines.insert(insert_pos, init_code)
        break

# Write back
with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Added transform initialization')
PYEOF

python3 /tmp/add_transform_init.py

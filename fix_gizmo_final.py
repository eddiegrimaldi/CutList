#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Remove the spam logs in updateAxisOrientations
for i in range(len(lines)):
    if 'Found X axis meshes' in lines[i]:
        lines[i] = '// ' + lines[i]
    if 'Found Z axis meshes' in lines[i]:
        lines[i] = '// ' + lines[i]
    if 'Drag planes found' in lines[i]:
        lines[i] = '// ' + lines[i]

# Fix handlePointerDown to actually work
for i, line in enumerate(lines):
    if 'handlePointerDown(pointerInfo) {' in line and i < 500:
        # Add proper picking logic after the console.log
        for j in range(i+1, min(i+10, len(lines))):
            if 'const pickInfo = pointerInfo.pickInfo;' in lines[j]:
                lines[j] = '''        const pickInfo = pointerInfo.pickInfo || this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => mesh.isGizmo
        );
        console.log("Picked mesh:", pickInfo.hit ? pickInfo.pickedMesh.name : "none", "isGizmo:", pickInfo.pickedMesh?.isGizmo);
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed gizmo picking and removed spam")

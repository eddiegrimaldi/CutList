#\!/usr/bin/env python3
import re

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Fix 1: Make gizmo meshes pickable
# Find the line with mesh.isGizmo = true and add isPickable
content = re.sub(
    r'(\s+)(mesh\.isGizmo = true;)',
    r'\1mesh.isPickable = true;\n\1\2',
    content
)

# Fix 2: Fix picking to check for boards
content = re.sub(
    r'const partPickInfo = this\.scene\.pick\(x, y, \(mesh\) => mesh && mesh\.partData\);',
    r'const partPickInfo = this.scene.pick(x, y, (mesh) => mesh && (mesh.board || mesh.partData));',
    content
)

# Fix 3: Fix the selection call to pass correct data
content = re.sub(
    r'if \(partPickInfo\.hit && partPickInfo\.pickedMesh && partPickInfo\.pickedMesh\.partData\) \{[\s]*this\.selectPart\(partPickInfo\.pickedMesh\.partData\);',
    r'if (partPickInfo.hit && partPickInfo.pickedMesh && (partPickInfo.pickedMesh.board || partPickInfo.pickedMesh.partData)) {\n                    this.selectPart(partPickInfo.pickedMesh);',
    content
)

# Fix 4: Add dragOffset calculation in setupDragPlane
pattern = r'(this\.dragPlane = BABYLON\.Plane\.FromPositionAndNormal\(meshPosition, cameraDirection\);)'
replacement = r'''\1
        
        // Calculate drag offset
        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            BABYLON.Matrix.Identity(),
            this.camera
        );
        
        const distance = this.dragPlane.intersectsLine(ray);
        if (distance) {
            const pickedPoint = ray.origin.add(ray.direction.scale(distance));
            this.dragOffset = this.targetMesh.position.subtract(pickedPoint);
        } else {
            this.dragOffset = BABYLON.Vector3.Zero();
        }'''
content = re.sub(pattern, replacement, content)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Gizmo fixes applied successfully')

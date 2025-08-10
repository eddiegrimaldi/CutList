#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix Y axis (around line 11080)
for i in range(11075, 11090):
    if 'rotationGizmo.yGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+6):
            if 'const delta = mesh.rotation.subtract' in lines[j]:
                lines[j] = '''                        // Work like move tool
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        if (this.ghostMesh) {
                            this.ghostMesh.rotation = currentRot.clone();
                            mesh.rotation = this.transformStartRotation.clone();
                        }
                        
'''
                break
        break

# Fix Z axis (around line 11115)  
for i in range(11110, 11125):
    if 'rotationGizmo.zGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+6):
            if 'const delta = mesh.rotation.subtract' in lines[j]:
                lines[j] = '''                        // Work like move tool
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        if (this.ghostMesh) {
                            this.ghostMesh.rotation = currentRot.clone();
                            mesh.rotation = this.transformStartRotation.clone();
                        }
                        
'''
                break
        break

# Now fix the onDragEnd to apply ghost rotation (around 11053, 11087, 11122)
for i in range(11050, 11060):
    if 'rotationGizmo.xGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+5):
            if 'if (mesh)' in lines[j]:
                # Add ghost application
                lines[j] = '''                    if (mesh) {
                        // Apply ghost rotation to mesh
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed all rotation axes")

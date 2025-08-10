#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix X axis drag end (line 11053-11055)
if 'this.hideTransformDisplay();' in lines[11053]:
    lines[11053] = '''                        // Apply final rotation from ghost before removing
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
'''

# Find Y and Z drag end handlers
for i in range(11060, 11120):
    if 'rotationGizmo.yGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        # Find the hideTransformDisplay line
        for j in range(i+1, min(i+10, len(lines))):
            if 'this.hideTransformDisplay();' in lines[j]:
                lines[j] = '''                        // Apply final rotation from ghost before removing
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
'''
                break
        break

for i in range(11090, 11150):
    if 'rotationGizmo.zGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        # Find the hideTransformDisplay line
        for j in range(i+1, min(i+10, len(lines))):
            if 'this.hideTransformDisplay();' in lines[j]:
                lines[j] = '''                        // Apply final rotation from ghost before removing
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed rotation drag end handlers")

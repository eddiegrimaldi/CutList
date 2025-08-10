#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix rotation X axis to attach to ghost
for i in range(11020, 11035):
    if 'rotationGizmo.xGizmo.dragBehavior.onDragStartObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'this.createGhostMesh(mesh);' in lines[j]:
                lines[j] = '''                        this.createGhostMesh(mesh);
                        this.transformStartRotation = mesh.rotation.clone();
                        
                        // ATTACH ROTATION GIZMO TO GHOST\!
                        if (this.ghostMesh) {
                            this.rotationGizmo.attachedMesh = this.ghostMesh;
                            this.originalMeshBeingTransformed = mesh;
                        }
'''
                break
        break

# Simplify rotation drag handler
for i in range(11035, 11055):
    if 'rotationGizmo.xGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'const mesh = this.rotationGizmo.attachedMesh;' in lines[j]:
                lines[j] = '''                    // Gizmo rotates ghost directly now
                    const ghost = this.rotationGizmo.attachedMesh;
                    if (ghost && this.transformStartRotation) {
                        const delta = ghost.rotation.subtract(this.transformStartRotation);
                        this.updateTransformDisplay(delta, 'rotation');
                    }
'''
                # Remove rest of handler
                for k in range(j+1, j+10):
                    if '});' in lines[k]:
                        lines[j+1:k] = []
                        break
                break
        break

# Fix rotation drag end
for i in range(11050, 11070):
    if 'rotationGizmo.xGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'const mesh = this.rotationGizmo.attachedMesh;' in lines[j]:
                lines[j] = '''                    const ghost = this.rotationGizmo.attachedMesh;
                    const mesh = this.originalMeshBeingTransformed;
'''
                for k in range(j+1, j+10):
                    if 'this.removeGhostMesh();' in lines[k]:
                        lines[k] = '''                        this.removeGhostMesh();
                        
                        // Reattach to original and apply rotation
                        if (mesh && ghost) {
                            mesh.rotation.copyFrom(ghost.rotation);
                            this.rotationGizmo.attachedMesh = mesh;
                            this.originalMeshBeingTransformed = null;
                        }
'''
                        break
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed rotation to use ghost")

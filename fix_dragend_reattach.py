#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix drag end to reattach gizmo to original
for i in range(10875, 10890):
    if 'positionGizmo.xGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+15):
            if 'this.removeGhostMesh();' in lines[j]:
                lines[j] = '''                        this.removeGhostMesh();
                        
                        // Reattach gizmo to original mesh
                        this.positionGizmo.attachedMesh = mesh;
                        this.originalMeshBeingTransformed = null;
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed drag end to reattach gizmo")

#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Modify move tool X axis drag start to attach gizmo to ghost
for i in range(10843, 10855):
    if 'positionGizmo.xGizmo.dragBehavior.onDragStartObservable' in lines[i]:
        # Find where ghost is created
        for j in range(i+1, i+10):
            if 'this.createGhostMesh(mesh);' in lines[j]:
                lines[j] = '''                        this.createGhostMesh(mesh);
                        this.transformStartPosition = mesh.position.clone();
                        
                        // ATTACH GIZMO TO GHOST INSTEAD OF ORIGINAL\!
                        if (this.ghostMesh) {
                            this.positionGizmo.attachedMesh = this.ghostMesh;
                            this.originalMeshBeingTransformed = mesh; // Remember the original
                        }
'''
                break
        break

# Now simplify the onDrag handler since gizmo moves ghost directly
for i in range(10856, 10875):
    if 'positionGizmo.xGizmo.dragBehavior.onDragObservable' in lines[i]:
        # Replace the entire handler
        for j in range(i+1, i+20):
            if 'const mesh = this.positionGizmo.attachedMesh;' in lines[j]:
                # Find the end of this handler
                brace_count = 1
                start_j = j
                for k in range(j+1, j+30):
                    if '{' in lines[k]:
                        brace_count += 1
                    if '}' in lines[k]:
                        brace_count -= 1
                        if brace_count == 0:
                            # Replace entire handler
                            lines[start_j:k+1] = ['''                    // Gizmo now moves ghost directly - no fighting\!
                    const ghost = this.positionGizmo.attachedMesh; // This is the ghost
                    if (ghost && this.transformStartPosition) {
                        const delta = ghost.position.subtract(this.transformStartPosition);
                        this.updateTransformDisplay(delta, 'position', ghost.position);
                        this.updateMeasurementArrow(this.transformStartPosition, ghost.position);
                    }
                });
''']
                            break
                break
        break

# Fix drag end to apply ghost position to original
for i in range(10875, 10890):
    if 'positionGizmo.xGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'const mesh = this.positionGizmo.attachedMesh;' in lines[j]:
                lines[j] = '''                    const ghost = this.positionGizmo.attachedMesh; // This is the ghost
                    const mesh = this.originalMeshBeingTransformed; // The original board
'''
                for k in range(j+1, j+10):
                    if 'mesh.position.copyFrom(this.ghostMesh.position);' in lines[k]:
                        lines[k] = '''                            mesh.position.copyFrom(ghost.position); // Apply ghost position to original
'''
                        break
                    elif 'if (this.ghostMesh)' in lines[k]:
                        lines[k] = '''                        if (ghost && mesh) {
'''
                        break
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Attached gizmo to ghost mesh for move tool")

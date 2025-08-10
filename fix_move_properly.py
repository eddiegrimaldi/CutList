#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix move X axis drag handler - DON'T reset mesh position
for i in range(10856, 10875):
    if 'this.positionGizmo.xGizmo.dragBehavior.onDragObservable' in lines[i]:
        # Find and replace the drag handler
        for j in range(i+1, i+20):
            if 'mesh.position = this.transformStartPosition.clone();' in lines[j]:
                # Comment out the line that resets position
                lines[j] = '                        // DON\'T RESET: mesh.position = this.transformStartPosition.clone();\n'
                break
        break

# Fix Y axis
for i in range(10890, 10910):
    if 'this.positionGizmo.yGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+20):
            if 'mesh.position = this.transformStartPosition.clone();' in lines[j]:
                lines[j] = '                        // DON\'T RESET: mesh.position = this.transformStartPosition.clone();\n'
                break
        break

# Fix Z axis
for i in range(10925, 10945):
    if 'this.positionGizmo.zGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+20):
            if 'mesh.position = this.transformStartPosition.clone();' in lines[j]:
                lines[j] = '                        // DON\'T RESET: mesh.position = this.transformStartPosition.clone();\n'
                break
        break

# Now fix the drag end handlers to reset mesh to start and apply ghost position
for i in range(10875, 10890):
    if 'positionGizmo.xGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'if (this.ghostMesh)' in lines[j]:
                lines[j] = '''                        // Apply the final position from ghost
                        if (this.ghostMesh) {
                            // Reset mesh to start, then apply ghost offset
                            const finalPos = this.ghostMesh.position.clone();
                            mesh.position = finalPos;
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed move tool - no more fighting")

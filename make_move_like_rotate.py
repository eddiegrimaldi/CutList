#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Change move tool X axis to work like rotate (move original, ghost stays)
for i in range(10856, 10875):
    if 'positionGizmo.xGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+20):
            if '// Calculate delta but don' in lines[j]:
                # Find the block that resets mesh position
                for k in range(j, j+10):
                    if 'mesh.position = this.transformStartPosition.clone();' in lines[k]:
                        # Comment out the line that resets position
                        lines[k] = '                        // REMOVED: Let mesh move naturally\n'
                        break
                # Also don't move the ghost
                for k in range(j, j+10):
                    if 'this.ghostMesh.position = currentPos.clone();' in lines[k]:
                        lines[k] = '                        // REMOVED: Ghost stays at start position\n'
                        break
                break
        break

# Do same for Y axis
for i in range(10890, 10910):
    if 'positionGizmo.yGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+20):
            if 'mesh.position = this.transformStartPosition.clone();' in lines[j]:
                lines[j] = '                        // REMOVED: Let mesh move naturally\n'
            if 'this.ghostMesh.position = currentPos.clone();' in lines[j]:
                lines[j] = '                        // REMOVED: Ghost stays at start position\n'
        break

# Do same for Z axis  
for i in range(10925, 10945):
    if 'positionGizmo.zGizmo.dragBehavior.onDragObservable' in lines[i]:
        for j in range(i+1, i+20):
            if 'mesh.position = this.transformStartPosition.clone();' in lines[j]:
                lines[j] = '                        // REMOVED: Let mesh move naturally\n'
            if 'this.ghostMesh.position = currentPos.clone();' in lines[j]:
                lines[j] = '                        // REMOVED: Ghost stays at start position\n'
        break

# Fix drag end to restore original position
for i in range(10875, 10890):
    if 'positionGizmo.xGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'mesh.position.copyFrom(this.ghostMesh.position);' in lines[j]:
                lines[j] = '                            // Mesh already at final position, ghost was left behind\n'
                break
        break

# Same for Y and Z
for i in range(10910, 10925):
    if 'positionGizmo.yGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'mesh.position.copyFrom(this.ghostMesh.position);' in lines[j]:
                lines[j] = '                            // Mesh already at final position\n'
                break
        break

for i in range(10945, 10960):
    if 'positionGizmo.zGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'mesh.position.copyFrom(this.ghostMesh.position);' in lines[j]:
                lines[j] = '                            // Mesh already at final position\n'
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print(Made move tool work like rotate - moves original, ghost stays)

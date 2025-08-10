#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix move tool X axis drag start (around line 10845)
for i in range(10844, 10854):
    if 'this.createGhostMesh(mesh);' in lines[i]:
        lines[i] = '''                        this.createGhostMesh(mesh);
                        this.transformStartPosition = mesh.position.clone(); // CRITICAL: Capture start position\!
'''
        break

# Fix Y axis (around line 10885)
for i in range(10880, 10895):
    if 'positionGizmo.yGizmo.dragBehavior.onDragStartObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'this.createGhostMesh(mesh);' in lines[j]:
                lines[j] = '''                        this.createGhostMesh(mesh);
                        this.transformStartPosition = mesh.position.clone(); // CRITICAL: Capture start position\!
'''
                break
        break

# Fix Z axis (around line 10925)
for i in range(10920, 10935):
    if 'positionGizmo.zGizmo.dragBehavior.onDragStartObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'this.createGhostMesh(mesh);' in lines[j]:
                lines[j] = '''                        this.createGhostMesh(mesh);
                        this.transformStartPosition = mesh.position.clone(); // CRITICAL: Capture start position\!
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed move tool - added transformStartPosition capture")

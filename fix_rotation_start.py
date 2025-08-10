#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix rotation X axis drag start
for i in range(11000, 11040):
    if 'rotationGizmo.xGizmo.dragBehavior.onDragStartObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'this.createGhostMesh(mesh);' in lines[j]:
                lines[j] = '''                        this.createGhostMesh(mesh);
                        this.transformStartRotation = mesh.rotation.clone(); // Capture start rotation\!
'''
                break
        break

# Fix Y axis
for i in range(11050, 11080):
    if 'rotationGizmo.yGizmo.dragBehavior.onDragStartObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'this.createGhostMesh(mesh);' in lines[j]:
                lines[j] = '''                        this.createGhostMesh(mesh);
                        this.transformStartRotation = mesh.rotation.clone(); // Capture start rotation\!
'''
                break
        break

# Fix Z axis
for i in range(11085, 11115):
    if 'rotationGizmo.zGizmo.dragBehavior.onDragStartObservable' in lines[i]:
        for j in range(i+1, i+10):
            if 'this.createGhostMesh(mesh);' in lines[j]:
                lines[j] = '''                        this.createGhostMesh(mesh);
                        this.transformStartRotation = mesh.rotation.clone(); // Capture start rotation\!
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed rotation tool - added transformStartRotation capture")

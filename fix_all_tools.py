#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix rotation tool X axis drag (line 11046-11052)
for i in range(11046, 11053):
    if i == 11048 and 'if (mesh && this.transformStartRotation)' in lines[i]:
        lines[i] = '                    if (mesh && this.transformStartRotation && this.ghostMesh) {\n'
    elif i == 11049 and 'const delta = mesh.rotation.subtract' in lines[i]:
        lines[i] = '''                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
'''
    elif i == 11050 and 'this.updateTransformDisplay' in lines[i]:
        lines[i] = '                        this.updateTransformDisplay(delta, \'rotation\');\n'

# Fix rotation Y axis (find and fix)
for i in range(11080, 11090):
    if 'if (mesh && this.transformStartRotation)' in lines[i]:
        lines[i] = '                    if (mesh && this.transformStartRotation && this.ghostMesh) {\n'
        # Fix the next lines
        if i+1 < len(lines) and 'const delta = mesh.rotation.subtract' in lines[i+1]:
            lines[i+1] = '''                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, \'rotation\');
'''
            lines[i+2] = ''  # Remove old updateTransformDisplay line

# Fix rotation Z axis (find and fix)
for i in range(11115, 11125):
    if 'if (mesh && this.transformStartRotation)' in lines[i]:
        lines[i] = '                    if (mesh && this.transformStartRotation && this.ghostMesh) {\n'
        # Fix the next lines
        if i+1 < len(lines) and 'const delta = mesh.rotation.subtract' in lines[i+1]:
            lines[i+1] = '''                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, \'rotation\');
'''
            lines[i+2] = ''  # Remove old updateTransformDisplay line

# Fix rotation drag end handlers to apply ghost rotation
for i in range(11053, 11070):
    if 'this.rotationGizmo.xGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        # Find the hideTransformDisplay line
        for j in range(i+1, min(i+10, len(lines))):
            if 'this.hideTransformDisplay()' in lines[j]:
                # Insert ghost application before hiding
                lines[j] = '''                        // FIXED: Apply final rotation from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
'''
                break

# Do same for Y and Z axes
for i in range(11085, 11105):
    if 'this.rotationGizmo.yGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, min(i+10, len(lines))):
            if 'this.hideTransformDisplay()' in lines[j]:
                lines[j] = '''                        // FIXED: Apply final rotation from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
'''
                break

for i in range(11120, 11140):
    if 'this.rotationGizmo.zGizmo.dragBehavior.onDragEndObservable' in lines[i]:
        for j in range(i+1, min(i+10, len(lines))):
            if 'this.hideTransformDisplay()' in lines[j]:
                lines[j] = '''                        // FIXED: Apply final rotation from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
'''
                break

# Add modal to move tool drag end handlers
for i in range(10850, 10980):
    if 'this.positionGizmo.' in lines[i] and 'dragBehavior.onDragEndObservable' in lines[i]:
        # Find where transform is applied
        for j in range(i+1, min(i+15, len(lines))):
            if 'mesh.position.copyFrom(this.ghostMesh.position)' in lines[j]:
                # Add modal after position is applied
                for k in range(j+1, min(j+5, len(lines))):
                    if 'this.removeGhostMesh()' in lines[k]:
                        lines[k] = '''                        this.removeGhostMesh();
                        // FIXED: Add precision modal for move tool
                        this.showTransformConfirmationModal(mesh, mesh.position, \'position\');
'''
                        break

# Write the file back
with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print(Fixed all three tools)

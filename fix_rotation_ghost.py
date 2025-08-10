#\!/usr/bin/env python3
import re

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Fix rotation X axis onDrag to update ghost instead of displaying delta
old_pattern = r'(this\.rotationGizmo\.xGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[^}]*?const mesh = this\.rotationGizmo\.attachedMesh;[^}]*?if \(mesh && this\.transformStartRotation\) \{[^}]*?const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[^}]*?this\.updateTransformDisplay\(delta, \'rotation\'\);[^}]*?\}[^}]*?\}\);)'

new_code = '''this.rotationGizmo.xGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // Get current rotation that gizmo applied to mesh
                        const currentRotation = mesh.rotation.clone();
                        const delta = currentRotation.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, reset original to start
                        this.ghostMesh.rotation.copyFrom(currentRotation);
                        mesh.rotation.copyFrom(this.transformStartRotation);
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }
                });'''

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Fix Y axis
old_pattern = r'(this\.rotationGizmo\.yGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[^}]*?const mesh = this\.rotationGizmo\.attachedMesh;[^}]*?if \(mesh && this\.transformStartRotation\) \{[^}]*?const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[^}]*?this\.updateTransformDisplay\(delta, \'rotation\'\);[^}]*?\}[^}]*?\}\);)'

new_code = '''this.rotationGizmo.yGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // Get current rotation that gizmo applied to mesh
                        const currentRotation = mesh.rotation.clone();
                        const delta = currentRotation.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, reset original to start
                        this.ghostMesh.rotation.copyFrom(currentRotation);
                        mesh.rotation.copyFrom(this.transformStartRotation);
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }
                });'''

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Fix Z axis
old_pattern = r'(this\.rotationGizmo\.zGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[^}]*?const mesh = this\.rotationGizmo\.attachedMesh;[^}]*?if \(mesh && this\.transformStartRotation\) \{[^}]*?const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[^}]*?this\.updateTransformDisplay\(delta, \'rotation\'\);[^}]*?\}[^}]*?\}\);)'

new_code = '''this.rotationGizmo.zGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // Get current rotation that gizmo applied to mesh
                        const currentRotation = mesh.rotation.clone();
                        const delta = currentRotation.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, reset original to start
                        this.ghostMesh.rotation.copyFrom(currentRotation);
                        mesh.rotation.copyFrom(this.transformStartRotation);
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }
                });'''

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Fix rotation drag end to apply ghost rotation to mesh
old_pattern = r'(this\.rotationGizmo\.xGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{[^}]*?const mesh = this\.rotationGizmo\.attachedMesh;[^}]*?if \(mesh\) \{[^}]*?this\.hideTransformDisplay\(\);[^}]*?this\.removeGhostMesh\(\);)'

new_code = '''this.rotationGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        // Apply final rotation from ghost before removing
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();'''

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Y axis drag end
old_pattern = r'(this\.rotationGizmo\.yGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{[^}]*?const mesh = this\.rotationGizmo\.attachedMesh;[^}]*?if \(mesh\) \{[^}]*?this\.hideTransformDisplay\(\);[^}]*?this\.removeGhostMesh\(\);)'

new_code = '''this.rotationGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        // Apply final rotation from ghost before removing
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();'''

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Z axis drag end
old_pattern = r'(this\.rotationGizmo\.zGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{[^}]*?const mesh = this\.rotationGizmo\.attachedMesh;[^}]*?if \(mesh\) \{[^}]*?this\.hideTransformDisplay\(\);[^}]*?this\.removeGhostMesh\(\);)'

new_code = '''this.rotationGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        // Apply final rotation from ghost before removing
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();'''

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print(Fixed rotation to use ghost mesh like move tool)

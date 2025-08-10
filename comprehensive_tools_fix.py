#\!/usr/bin/env python3
import re

with open('drawing-world.js', 'r') as f:
    content = f.read()

print("Starting comprehensive tools fix...")

# FIX 1: Add modal to Move tool (all 3 axes)
# X axis
pattern = r'(if \(this\.ghostMesh\) \{\s*mesh\.position\.copyFrom\(this\.ghostMesh\.position\);\s*\}\s*this\.hideTransformDisplay\(\);\s*this\.removeGhostMesh\(\);)'
replacement = '''if (this.ghostMesh) {
                            mesh.position.copyFrom(this.ghostMesh.position);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        // FIXED: Add precision modal for move tool
                        this.showTransformConfirmationModal(mesh, mesh.position, 'position');'''

content = re.sub(pattern, replacement, content)
print("Fixed: Added modal to move tool")

# FIX 2: Make Rotate tool use ghost mesh during drag (X axis)
pattern = r'(this\.rotationGizmo\.xGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{\s*const mesh = this\.rotationGizmo\.attachedMesh;\s*if \(mesh && this\.transformStartRotation\) \{\s*const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);\s*this\.updateTransformDisplay\(delta, \'rotation\'\);\s*\})'
replacement = '''this.rotationGizmo.xGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }'''

content = re.sub(pattern, replacement, content)

# Y axis
pattern = r'(this\.rotationGizmo\.yGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{\s*const mesh = this\.rotationGizmo\.attachedMesh;\s*if \(mesh && this\.transformStartRotation\) \{\s*const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);\s*this\.updateTransformDisplay\(delta, \'rotation\'\);\s*\})'
replacement = '''this.rotationGizmo.yGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }'''

content = re.sub(pattern, replacement, content)

# Z axis
pattern = r'(this\.rotationGizmo\.zGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{\s*const mesh = this\.rotationGizmo\.attachedMesh;\s*if \(mesh && this\.transformStartRotation\) \{\s*const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);\s*this\.updateTransformDisplay\(delta, \'rotation\'\);\s*\})'
replacement = '''this.rotationGizmo.zGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }'''

content = re.sub(pattern, replacement, content)
print("Fixed: Rotate tool now uses ghost mesh")

# FIX 3: Apply ghost rotation on drag end
pattern = r'(this\.rotationGizmo\.xGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{\s*const mesh = this\.rotationGizmo\.attachedMesh;\s*if \(mesh\) \{\s*this\.hideTransformDisplay\(\);\s*this\.removeGhostMesh\(\);)'
replacement = '''this.rotationGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        // FIXED: Apply final rotation from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();'''

content = re.sub(pattern, replacement, content)

# Y axis
pattern = r'(this\.rotationGizmo\.yGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{\s*const mesh = this\.rotationGizmo\.attachedMesh;\s*if \(mesh\) \{\s*this\.hideTransformDisplay\(\);\s*this\.removeGhostMesh\(\);)'
replacement = '''this.rotationGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        // FIXED: Apply final rotation from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();'''

content = re.sub(pattern, replacement, content)

# Z axis
pattern = r'(this\.rotationGizmo\.zGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{\s*const mesh = this\.rotationGizmo\.attachedMesh;\s*if \(mesh\) \{\s*this\.hideTransformDisplay\(\);\s*this\.removeGhostMesh\(\);)'
replacement = '''this.rotationGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        // FIXED: Apply final rotation from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();'''

content = re.sub(pattern, replacement, content)
print("Fixed: Rotate tool applies ghost transform on drag end")

with open('drawing-world.js', 'w') as f:
    f.write(content)

print("All fixes applied successfully\!")

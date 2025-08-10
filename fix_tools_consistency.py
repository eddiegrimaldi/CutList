#\!/usr/bin/env python3
import re

# Read the file
with open('drawing-world.js', 'r') as f:
    content = f.read()

# Fix rotation tool to use ghost mesh during drag (like move tool)
# Find the rotation drag observable patterns and fix them

fixes_made = 0

# Fix rotation X axis onDrag
old_pattern = r'(this\.rotationGizmo\.xGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[^}]*?const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[^}]*?this\.updateTransformDisplay\(delta, .rotation.\);[^}]*?\}\);)'
new_code = '''this.rotationGizmo.xGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }
                });'''

if re.search(old_pattern, content):
    content = re.sub(old_pattern, new_code, content)
    fixes_made += 1

# Fix rotation Y axis onDrag
old_pattern = r'(this\.rotationGizmo\.yGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[^}]*?const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[^}]*?this\.updateTransformDisplay\(delta, .rotation.\);[^}]*?\}\);)'
new_code = '''this.rotationGizmo.yGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }
                });'''

if re.search(old_pattern, content):
    content = re.sub(old_pattern, new_code, content)
    fixes_made += 1

# Fix rotation Z axis onDrag
old_pattern = r'(this\.rotationGizmo\.zGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[^}]*?const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[^}]*?this\.updateTransformDisplay\(delta, .rotation.\);[^}]*?\}\);)'
new_code = '''this.rotationGizmo.zGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        // FIXED: Update ghost mesh rotation, not original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Apply rotation to ghost, keep original at start rotation
                        this.ghostMesh.rotation = currentRot.clone();
                        mesh.rotation = this.transformStartRotation.clone();
                        
                        this.updateTransformDisplay(delta, 'rotation');
                    }
                });'''

if re.search(old_pattern, content):
    content = re.sub(old_pattern, new_code, content)
    fixes_made += 1

# Write back
with open('drawing-world.js', 'w') as f:
    f.write(content)

print(fFixed {fixes_made} rotation drag handlers to use ghost mesh)

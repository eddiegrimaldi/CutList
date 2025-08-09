#\!/usr/bin/env python3

# Read the file
with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find where to add position gizmo observers
for i, line in enumerate(lines):
    if 'this.positionGizmo.zGizmo.coloredMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.6);' in line:
        # Insert after the color setup
        insert_pos = i + 1
        
        observers_code = '''            
            // Add drag observers for position gizmo
            this.positionGizmo.onDragStartObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'position';
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            this.positionGizmo.onDragObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh && this.transformStartPosition) {
                    const snappedPos = this.applyGridSnap(mesh.position);
                    mesh.position = snappedPos;
                    const delta = snappedPos.subtract(this.transformStartPosition);
                    this.updateTransformDisplay(delta, 'position');
                }
            });
            
            this.positionGizmo.onDragEndObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    this.showTransformConfirmationModal(mesh, mesh.position, 'position');
                }
            });
'''
        lines.insert(insert_pos, observers_code)
        break

# Find rotation gizmo and add its observers
for i, line in enumerate(lines):
    if 'this.rotationGizmo.onDragEndObservable.add' in line:
        # Replace the existing observer with our new ones
        # Find the end of this observer block
        brace_count = 0
        start_index = i
        end_index = i
        
        for j in range(i, min(i + 50, len(lines))):
            if '{' in lines[j]:
                brace_count += lines[j].count('{')
            if '}' in lines[j]:
                brace_count -= lines[j].count('}')
            if brace_count == 0 and j > i:
                end_index = j + 1
                break
        
        # Replace with new observers
        new_observers = '''            // Add drag observers for rotation gizmo
            this.rotationGizmo.onDragStartObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'rotation';
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            this.rotationGizmo.onDragObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh && this.transformStartRotation) {
                    const snappedRot = this.applyRotationSnap(mesh.rotation);
                    mesh.rotation = snappedRot;
                    const delta = snappedRot.subtract(this.transformStartRotation);
                    this.updateTransformDisplay(delta, 'rotation');
                }
            });
            
            this.rotationGizmo.onDragEndObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    mesh.refreshBoundingInfo();
                    if (mesh.partData) {
                        const bounds = mesh.getBoundingInfo().boundingBox;
                        console.log('New bounds after rotation:', bounds);
                    }
                    this.showTransformConfirmationModal(mesh, mesh.rotation, 'rotation');
                }
            });
'''
        # Remove old lines and insert new
        del lines[start_index:end_index]
        lines.insert(start_index, new_observers + '\n')
        break

# Write back
with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Added gizmo observers successfully')

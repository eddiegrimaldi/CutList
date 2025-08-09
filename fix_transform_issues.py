#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# 1. Add tracking for which axis is being dragged
init_addition = '''        this.currentDragAxis = null; // 'x', 'y', or 'z'
        this.draggedValue = 0; // The actual value being dragged
'''

# Insert after the existing transform tracking variables
content = content.replace(
    '        this.transformType = null; // \'position\' or \'rotation\'',
    '        this.transformType = null; // \'position\' or \'rotation\'\n' + init_addition
)

# 2. Replace position gizmo observers to track specific axis and not snap during drag
position_observers = '''            
            // Add drag observers for each axis
            this.positionGizmo.xGizmo.dragBehavior.onDragStartObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'position';
                    this.currentDragAxis = 'x';
                    this.draggedValue = 0;
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            this.positionGizmo.yGizmo.dragBehavior.onDragStartObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'position';
                    this.currentDragAxis = 'y';
                    this.draggedValue = 0;
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            this.positionGizmo.zGizmo.dragBehavior.onDragStartObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'position';
                    this.currentDragAxis = 'z';
                    this.draggedValue = 0;
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            // Single drag observer for all axes - don't snap during drag for smoothness
            this.positionGizmo.onDragObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh && this.transformStartPosition) {
                    // Don't apply snap during drag - keep it smooth
                    const delta = mesh.position.subtract(this.transformStartPosition);
                    
                    // Track the value for the specific axis
                    if (this.currentDragAxis === 'x') {
                        this.draggedValue = delta.x;
                    } else if (this.currentDragAxis === 'y') {
                        this.draggedValue = delta.y;
                    } else if (this.currentDragAxis === 'z') {
                        this.draggedValue = delta.z;
                    }
                    
                    this.updateTransformDisplay(delta, 'position');
                }
            });
            
            // Add drag end observers for each axis
            this.positionGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    // Apply snap at the end
                    const snappedPos = this.applyGridSnap(mesh.position);
                    mesh.position = snappedPos;
                    this.showTransformConfirmationModal(mesh, mesh.position, 'position');
                }
            });
            
            this.positionGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    const snappedPos = this.applyGridSnap(mesh.position);
                    mesh.position = snappedPos;
                    this.showTransformConfirmationModal(mesh, mesh.position, 'position');
                }
            });
            
            this.positionGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => {
                const mesh = this.positionGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    const snappedPos = this.applyGridSnap(mesh.position);
                    mesh.position = snappedPos;
                    this.showTransformConfirmationModal(mesh, mesh.position, 'position');
                }
            });'''

# Find and replace the position gizmo observers
start_pos = content.find('// Add drag observers for position gizmo')
if start_pos > 0:
    # Find the end of the position observers (before rotation observers)
    end_pos = content.find('// Create rotation gizmo with utility layer', start_pos)
    if end_pos > 0:
        # Remove old observers
        content = content[:start_pos] + position_observers + '\n            \n            ' + content[end_pos:]

# 3. Fix rotation observers - make sure mesh actually rotates
rotation_observers = '''            // Add drag observers for rotation gizmo axes
            this.rotationGizmo.xGizmo.dragBehavior.onDragStartObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'rotation';
                    this.currentDragAxis = 'x';
                    this.draggedValue = 0;
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            this.rotationGizmo.yGizmo.dragBehavior.onDragStartObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'rotation';
                    this.currentDragAxis = 'y';
                    this.draggedValue = 0;
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            this.rotationGizmo.zGizmo.dragBehavior.onDragStartObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.createGhostMesh(mesh);
                    this.transformType = 'rotation';
                    this.currentDragAxis = 'z';
                    this.draggedValue = 0;
                    if (\!this.transformDisplay) {
                        this.createTransformDisplay();
                    }
                }
            });
            
            this.rotationGizmo.onDragObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh && this.transformStartRotation) {
                    // Don't snap during drag
                    const delta = mesh.rotation.subtract(this.transformStartRotation);
                    
                    // Track the value for the specific axis
                    if (this.currentDragAxis === 'x') {
                        this.draggedValue = delta.x;
                    } else if (this.currentDragAxis === 'y') {
                        this.draggedValue = delta.y;
                    } else if (this.currentDragAxis === 'z') {
                        this.draggedValue = delta.z;
                    }
                    
                    this.updateTransformDisplay(delta, 'rotation');
                }
            });
            
            // Add drag end observers for each axis
            this.rotationGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    const snappedRot = this.applyRotationSnap(mesh.rotation);
                    mesh.rotation = snappedRot;
                    mesh.refreshBoundingInfo();
                    this.showTransformConfirmationModal(mesh, mesh.rotation, 'rotation');
                }
            });
            
            this.rotationGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    const snappedRot = this.applyRotationSnap(mesh.rotation);
                    mesh.rotation = snappedRot;
                    mesh.refreshBoundingInfo();
                    this.showTransformConfirmationModal(mesh, mesh.rotation, 'rotation');
                }
            });
            
            this.rotationGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => {
                const mesh = this.rotationGizmo.attachedMesh;
                if (mesh) {
                    this.hideTransformDisplay();
                    const snappedRot = this.applyRotationSnap(mesh.rotation);
                    mesh.rotation = snappedRot;
                    mesh.refreshBoundingInfo();
                    this.showTransformConfirmationModal(mesh, mesh.rotation, 'rotation');
                }
            });'''

# Find and replace rotation observers
start_rot = content.find('// Add drag observers for rotation gizmo')
if start_rot > 0:
    # Find the end of rotation observers (look for scale gizmo creation)
    end_rot = content.find('// Create scale gizmo with utility layer', start_rot)
    if end_rot > 0:
        content = content[:start_rot] + rotation_observers + '\n            \n            ' + content[end_rot:]

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Fixed transform tracking and smoothness issues')

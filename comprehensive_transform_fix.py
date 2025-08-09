#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# 1. First, let's properly track which axis is being dragged
# We need to use the individual axis gizmos' drag behaviors
axis_tracking_code = '''
            // Add individual axis tracking for position
            if (this.positionGizmo.xGizmo && this.positionGizmo.xGizmo.dragBehavior) {
                this.positionGizmo.xGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.positionGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'position';
                        this.currentDragAxis = 'x';
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.positionGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.positionGizmo.attachedMesh;
                    if (mesh) {
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.position, 'position');
                    }
                });
            }
            
            if (this.positionGizmo.yGizmo && this.positionGizmo.yGizmo.dragBehavior) {
                this.positionGizmo.yGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.positionGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'position';
                        this.currentDragAxis = 'y';
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.positionGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.positionGizmo.attachedMesh;
                    if (mesh) {
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.position, 'position');
                    }
                });
            }
            
            if (this.positionGizmo.zGizmo && this.positionGizmo.zGizmo.dragBehavior) {
                this.positionGizmo.zGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.positionGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'position';
                        this.currentDragAxis = 'z';
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.positionGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.positionGizmo.attachedMesh;
                    if (mesh) {
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.position, 'position');
                    }
                });
            }
'''

# Find where to insert the axis tracking (after position gizmo color setup)
pos_gizmo_color = 'this.positionGizmo.zGizmo.coloredMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.6);'
idx = content.find(pos_gizmo_color)
if idx > 0:
    # Find the end of the color setup block
    next_line = content.find('\n', idx)
    # Skip the existing drag observers
    old_observer_start = content.find('this.positionGizmo.onDragStartObservable.add', next_line)
    if old_observer_start > 0:
        # Find the end of the old observers
        old_observer_end = content.find('this.positionGizmo.onDragEndObservable.add', old_observer_start)
        if old_observer_end > 0:
            # Find the end of the drag end observable
            brace_count = 0
            for i in range(old_observer_end, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        # Find the });
                        end_idx = content.find('});', i)
                        if end_idx > 0:
                            end_idx += 3
                            # Replace the old observers with new ones
                            content = content[:old_observer_start] + axis_tracking_code + content[end_idx:]
                            break
                        break

# 2. Do the same for rotation gizmo
rotation_axis_code = '''
            // Add individual axis tracking for rotation
            if (this.rotationGizmo.xGizmo && this.rotationGizmo.xGizmo.dragBehavior) {
                this.rotationGizmo.xGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'rotation';
                        this.currentDragAxis = 'x';
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.rotationGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        mesh.refreshBoundingInfo();
                        this.showTransformConfirmationModal(mesh, mesh.rotation, 'rotation');
                    }
                });
            }
            
            if (this.rotationGizmo.yGizmo && this.rotationGizmo.yGizmo.dragBehavior) {
                this.rotationGizmo.yGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'rotation';
                        this.currentDragAxis = 'y';
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.rotationGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        mesh.refreshBoundingInfo();
                        this.showTransformConfirmationModal(mesh, mesh.rotation, 'rotation');
                    }
                });
            }
            
            if (this.rotationGizmo.zGizmo && this.rotationGizmo.zGizmo.dragBehavior) {
                this.rotationGizmo.zGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'rotation';
                        this.currentDragAxis = 'z';
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.rotationGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh) {
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        mesh.refreshBoundingInfo();
                        this.showTransformConfirmationModal(mesh, mesh.rotation, 'rotation');
                    }
                });
            }
'''

# Find rotation gizmo drag observers
rot_observer_start = content.find('this.rotationGizmo.onDragStartObservable.add')
if rot_observer_start > 0:
    rot_observer_end = content.find('this.rotationGizmo.onDragEndObservable.add', rot_observer_start)
    if rot_observer_end > 0:
        # Find the end of the drag end observable
        brace_count = 0
        for i in range(rot_observer_end, len(content)):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = content.find('});', i)
                    if end_idx > 0:
                        end_idx += 3
                        content = content[:rot_observer_start] + rotation_axis_code + content[end_idx:]
                        break
                    break

# 3. Reduce sensitivity by adjusting scale ratio
content = content.replace('this.positionGizmo.scaleRatio = 0.7', 'this.positionGizmo.scaleRatio = 1.0')
content = content.replace('this.rotationGizmo.scaleRatio = 0.7', 'this.rotationGizmo.scaleRatio = 1.0')

# 4. Remove rotation snapping during drag for smooth rotation
# Comment out applyRotationSnap during drag
rot_drag_obs = content.find('this.rotationGizmo.onDragObservable.add')
if rot_drag_obs > 0:
    snap_line = content.find('const snappedRot = this.applyRotationSnap', rot_drag_obs, rot_drag_obs + 1000)
    if snap_line > 0:
        # Comment out snap lines
        line_start = content.rfind('\n', 0, snap_line)
        content = content[:line_start+1] + '                    // Disabled for smooth rotation\n                    // ' + content[line_start+1:]

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Applied comprehensive fixes')

#\!/usr/bin/env python3
import re

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Find where scale gizmo is created and add drag observers after it
pattern = r'(// Make scale gizmo always visible[\s\S]*?\}\);[\s\S]*?if \(this\.scaleGizmo\.uniformScaleGizmo\)[\s\S]*?\}[\s\S]*?console\.log\(\'Gizmos created with utility layer\'\);)'

insertion = '''            
            // Add drag observers for scale gizmo
            if (this.scaleGizmo.xGizmo && this.scaleGizmo.xGizmo.dragBehavior) {
                this.scaleGizmo.xGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'scale';
                        this.currentDragAxis = 'x';
                        this.transformStartScale = mesh.scaling.clone();
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.scaleGizmo.xGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh && this.transformStartScale && this.ghostMesh) {
                        const currentScale = mesh.scaling.clone();
                        const delta = currentScale.subtract(this.transformStartScale);
                        
                        // Apply scale to ghost, keep original at start scale
                        this.ghostMesh.scaling = currentScale.clone();
                        mesh.scaling = this.transformStartScale.clone();
                        
                        this.updateTransformDisplay(delta, 'scale');
                    }
                });
                
                this.scaleGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        // Apply final scale from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.scaling.copyFrom(this.ghostMesh.scaling);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.scaling, 'scale');
                    }
                });
            }
            
            // Y axis
            if (this.scaleGizmo.yGizmo && this.scaleGizmo.yGizmo.dragBehavior) {
                this.scaleGizmo.yGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'scale';
                        this.currentDragAxis = 'y';
                        this.transformStartScale = mesh.scaling.clone();
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.scaleGizmo.yGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh && this.transformStartScale && this.ghostMesh) {
                        const currentScale = mesh.scaling.clone();
                        const delta = currentScale.subtract(this.transformStartScale);
                        
                        // Apply scale to ghost, keep original at start scale
                        this.ghostMesh.scaling = currentScale.clone();
                        mesh.scaling = this.transformStartScale.clone();
                        
                        this.updateTransformDisplay(delta, 'scale');
                    }
                });
                
                this.scaleGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        // Apply final scale from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.scaling.copyFrom(this.ghostMesh.scaling);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.scaling, 'scale');
                    }
                });
            }
            
            // Z axis
            if (this.scaleGizmo.zGizmo && this.scaleGizmo.zGizmo.dragBehavior) {
                this.scaleGizmo.zGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'scale';
                        this.currentDragAxis = 'z';
                        this.transformStartScale = mesh.scaling.clone();
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.scaleGizmo.zGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh && this.transformStartScale && this.ghostMesh) {
                        const currentScale = mesh.scaling.clone();
                        const delta = currentScale.subtract(this.transformStartScale);
                        
                        // Apply scale to ghost, keep original at start scale
                        this.ghostMesh.scaling = currentScale.clone();
                        mesh.scaling = this.transformStartScale.clone();
                        
                        this.updateTransformDisplay(delta, 'scale');
                    }
                });
                
                this.scaleGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        // Apply final scale from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.scaling.copyFrom(this.ghostMesh.scaling);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.scaling, 'scale');
                    }
                });
            }
            
            // Uniform scale
            if (this.scaleGizmo.uniformScaleGizmo && this.scaleGizmo.uniformScaleGizmo.dragBehavior) {
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'scale';
                        this.currentDragAxis = 'uniform';
                        this.transformStartScale = mesh.scaling.clone();
                        if (\!this.transformDisplay) {
                            this.createTransformDisplay();
                        }
                    }
                });
                
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh && this.transformStartScale && this.ghostMesh) {
                        const currentScale = mesh.scaling.clone();
                        const delta = currentScale.subtract(this.transformStartScale);
                        
                        // Apply scale to ghost, keep original at start scale
                        this.ghostMesh.scaling = currentScale.clone();
                        mesh.scaling = this.transformStartScale.clone();
                        
                        this.updateTransformDisplay(delta, 'scale');
                    }
                });
                
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        // Apply final scale from ghost BEFORE removing it
                        if (this.ghostMesh) {
                            mesh.scaling.copyFrom(this.ghostMesh.scaling);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.scaling, 'scale');
                    }
                });
            }
            
            console.log(\'Gizmos created with utility layer\');'''

# Find and replace
if re.search(pattern, content):
    content = re.sub(pattern, insertion, content)
    print("Scale gizmo observers added successfully")
else:
    print("Could not find insertion point")

with open('drawing-world.js', 'w') as f:
    f.write(content)

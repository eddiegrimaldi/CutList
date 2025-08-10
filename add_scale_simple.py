#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Find where to insert scale observers (after scale gizmo creation)
import re

pattern = r"(console\.log\('Gizmos created with utility layer'\);)"

scale_code = ''// Add scale tool observers for modal only
            if (this.scaleGizmo.uniformScaleGizmo && this.scaleGizmo.uniformScaleGizmo.dragBehavior) {
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.transformType = 'scale';
                        this.transformStartScale = mesh.scaling.clone();
                    }
                });
                
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.showTransformConfirmationModal(mesh, mesh.scaling, 'scale');
                    }
                });
            }
            
            console.log('Gizmos created with utility layer');''

content = re.sub(pattern, scale_code, content)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print("Added simple scale observers")

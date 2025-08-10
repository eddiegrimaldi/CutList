#\!/bin/bash

# Fix rotation X axis onDrag
perl -i -0777 -pe 's/(this\.rotationGizmo\.xGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[\s]*const mesh = this\.rotationGizmo\.attachedMesh;[\s]*if \(mesh && this\.transformStartRotation\) \{[\s]*const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[\s]*this\.updateTransformDisplay\(delta, '\''rotation'\''\);[\s]*\})/this.rotationGizmo.xGizmo.dragBehavior.onDragObservable.add(() => {
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation && this.ghostMesh) {
                        \/\/ Get current rotation that gizmo applied to mesh
                        const currentRotation = mesh.rotation.clone();
                        const delta = currentRotation.subtract(this.transformStartRotation);
                        
                        \/\/ Apply rotation to ghost, reset original to start
                        this.ghostMesh.rotation.copyFrom(currentRotation);
                        mesh.rotation.copyFrom(this.transformStartRotation);
                        
                        this.updateTransformDisplay(delta, '\''rotation'\'');
                    }/g' drawing-world.js

echo Fixed rotation tool to update ghost instead of original

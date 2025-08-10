#\!/bin/bash

# Fix Y axis
perl -i -0777 -pe 's/(this\.rotationGizmo\.yGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[\s]*const mesh = this\.rotationGizmo\.attachedMesh;[\s]*if \(mesh && this\.transformStartRotation\) \{[\s]*const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[\s]*this\.updateTransformDisplay\(delta, '\''rotation'\''\);[\s]*\})/this.rotationGizmo.yGizmo.dragBehavior.onDragObservable.add(() => {
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

# Fix Z axis
perl -i -0777 -pe 's/(this\.rotationGizmo\.zGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[\s]*const mesh = this\.rotationGizmo\.attachedMesh;[\s]*if \(mesh && this\.transformStartRotation\) \{[\s]*const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[\s]*this\.updateTransformDisplay\(delta, '\''rotation'\''\);[\s]*\})/this.rotationGizmo.zGizmo.dragBehavior.onDragObservable.add(() => {
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

# Fix drag end handlers to apply ghost rotation
# X axis
perl -i -pe 's/(this\.hideTransformDisplay\(\);[\s]*this\.removeGhostMesh\(\);[\s]*mesh\.refreshBoundingInfo\(\);)/\/\/ Apply final rotation from ghost before removing
                        if (this.ghostMesh) {
                            mesh.rotation.copyFrom(this.ghostMesh.rotation);
                        }
                        this.hideTransformDisplay();
                        this.removeGhostMesh();
                        mesh.refreshBoundingInfo();/g' drawing-world.js

echo Fixed all rotation axes

#\!/bin/bash

# First, let's add the modal calls to the move tool (X, Y, Z axes)
# Find move tool X axis drag end and add modal
perl -i -pe 's/(mesh\.position\.copyFrom\(this\.ghostMesh\.position\);)/\n                        \/\/ FIXED: Add precision modal for move tool\n                        this.showTransformConfirmationModal(mesh, mesh.position, '\''position'\'');/g' drawing-world.js

# Now fix the rotation tool to use ghost mesh during drag
# X axis
perl -i -0777 -pe 's/(this\.rotationGizmo\.xGizmo\.dragBehavior\.onDragObservable\.add\(\(\) => \{[\s]*const mesh = this\.rotationGizmo\.attachedMesh;[\s]*if \(mesh && this\.transformStartRotation\) \{[\s]*const delta = mesh\.rotation\.subtract\(this\.transformStartRotation\);[\s]*this\.updateTransformDisplay\(delta, '\''rotation'\''\);[\s]*\})/this.rotationGizmo.xGizmo.dragBehavior.onDragObservable.add(() => {\n                    const mesh = this.rotationGizmo.attachedMesh;\n                    if (mesh && this.transformStartRotation && this.ghostMesh) {\n                        \/\/ FIXED: Update ghost mesh rotation, not original\n                        const currentRot = mesh.rotation.clone();\n                        const delta = currentRot.subtract(this.transformStartRotation);\n                        \n                        \/\/ Apply rotation to ghost, keep original at start rotation\n                        this.ghostMesh.rotation = currentRot.clone();\n                        mesh.rotation = this.transformStartRotation.clone();\n                        \n                        this.updateTransformDisplay(delta, '\''rotation'\'');\n                    }/g' drawing-world.js

echo Tools fixed

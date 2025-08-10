#\!/bin/bash

# Fix Y axis to attach to ghost
perl -i -pe 's/(positionGizmo\.yGizmo\.dragBehavior\.onDragStartObservable[\s\S]*?this\.createGhostMesh\(mesh\);)/$1\n                        this.transformStartPosition = mesh.position.clone();\n                        if (this.ghostMesh) {\n                            this.positionGizmo.attachedMesh = this.ghostMesh;\n                            this.originalMeshBeingTransformed = mesh;\n                        }/g' drawing-world.js

# Fix Z axis to attach to ghost  
perl -i -pe 's/(positionGizmo\.zGizmo\.dragBehavior\.onDragStartObservable[\s\S]*?this\.createGhostMesh\(mesh\);)/$1\n                        this.transformStartPosition = mesh.position.clone();\n                        if (this.ghostMesh) {\n                            this.positionGizmo.attachedMesh = this.ghostMesh;\n                            this.originalMeshBeingTransformed = mesh;\n                        }/g' drawing-world.js

echo Fixed all move axes to use ghost

#\!/bin/bash

echo "Step 1: Add modal to move tool"
# Add modal after position is applied in move tool
perl -i -pe 's/(mesh\.position\.copyFrom\(this\.ghostMesh\.position\);\s*\})/$1\n                        this.showTransformConfirmationModal(mesh, mesh.position, '\''position'\'');/g' drawing-world.js

echo "Step 2: Remove duplicate rotation handlers"
# Comment out lines 11004-11015 (the problematic rotation position lock)
sed -i '11004,11015s/^/\/\/ REMOVED: /' drawing-world.js

echo "Step 3: Add scale modal"
# Add scale observer after line 11210 (after scale gizmo creation)
sed -i '11210a\
            \/\/ Add scale tool modal\
            if (this.scaleGizmo.uniformScaleGizmo \&\& this.scaleGizmo.uniformScaleGizmo.dragBehavior) {\
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragEndObservable.add(() => {\
                    const mesh = this.scaleGizmo.attachedMesh;\
                    if (mesh) {\
                        this.showTransformConfirmationModal(mesh, mesh.scaling, '\''scale'\'');\
                    }\
                });\
            }' drawing-world.js

echo "All fixes applied"

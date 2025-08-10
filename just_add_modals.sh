#\!/bin/bash

# Just add modal to move tool after position is applied
perl -i -pe 's/(mesh\.position\.copyFrom\(this\.ghostMesh\.position\);\s*\})/$1\n                        this.showTransformConfirmationModal(mesh, mesh.position, '\''position'\'');/g' drawing-world.js

# Add modal to scale tool (if it has uniform scale gizmo)
sed -i '/this.scaleGizmo.uniformScaleGizmo.coloredMaterial.backFaceCulling = false;/a\
            }\n            \n            // Add scale tool modal\n            if (this.scaleGizmo.uniformScaleGizmo && this.scaleGizmo.uniformScaleGizmo.dragBehavior) {\n                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragEndObservable.add(() => {\n                    const mesh = this.scaleGizmo.attachedMesh;\n                    if (mesh) {\n                        this.showTransformConfirmationModal(mesh, mesh.scaling, '\''scale'\'');\n                    }\n                });\n            ' drawing-world.js

echo Added modals only - keeping original behavior

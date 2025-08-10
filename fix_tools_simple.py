#\!/usr/bin/env python3
import re

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Just add modal to Move tool drag end (all axes)
# Find all position gizmo drag end handlers
patterns_and_replacements = [
    # Move tool - add modal after position is applied
    (r'(if \(this\.ghostMesh\) \{\s*mesh\.position\.copyFrom\(this\.ghostMesh\.position\);\s*\}\s*this\.hideTransformDisplay\(\);\s*this\.removeGhostMesh\(\);)',
     r'\1\n                        // Add precision modal for move tool\n                        this.showTransformConfirmationModal(mesh, mesh.position, "position");'),
]

for pattern, replacement in patterns_and_replacements:
    content = re.sub(pattern, replacement, content)

# For rotate tool - it already has modal but let's ensure the ghost mesh is created
# Add ghost mesh creation if missing
rotate_start_pattern = r'(this\.rotationGizmo\.[xyz]Gizmo\.dragBehavior\.onDragStartObservable\.add\(\(\) => \{\s*const mesh = this\.rotationGizmo\.attachedMesh;\s*if \(mesh\) \{)'
rotate_start_check = re.findall(rotate_start_pattern, content)

# For scale tool - add complete observers since they don't exist
scale_insertion_point = r'(console\.log\(\'Gizmos created with utility layer\'\);)'
scale_observers = '''
            
            // Add scale tool observers
            if (this.scaleGizmo.uniformScaleGizmo && this.scaleGizmo.uniformScaleGizmo.dragBehavior) {
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragStartObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.createGhostMesh(mesh);
                        this.transformType = 'scale';
                        this.transformStartScale = mesh.scaling.clone();
                    }
                });
                
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.removeGhostMesh();
                        this.showTransformConfirmationModal(mesh, mesh.scaling, 'scale');
                    }
                });
            }
            
            console.log('Gizmos created with utility layer');'''

content = re.sub(scale_insertion_point, scale_observers, content)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print(Applied simple fixes - modals only, no fighting)

#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find line 11163 (after uniform scale gizmo setup)
if lines[11162].strip() == '}':
    # Insert scale observers before the closing brace
    scale_code = '''            
            // Add scale tool modal
            if (this.scaleGizmo.uniformScaleGizmo && this.scaleGizmo.uniformScaleGizmo.dragBehavior) {
                this.scaleGizmo.uniformScaleGizmo.dragBehavior.onDragEndObservable.add(() => {
                    const mesh = this.scaleGizmo.attachedMesh;
                    if (mesh) {
                        this.showTransformConfirmationModal(mesh, mesh.scaling, 'scale');
                    }
                });
            }
'''
    lines.insert(11163, scale_code)
    print("Added scale modal")

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# First, modify createGhostMesh to make ghost more visible for preview
for i in range(len(lines)):
    if 'ghostMaterial.alpha = 0.3;' in lines[i]:
        lines[i] = '        ghostMaterial.alpha = 0.6;  // More visible for preview\n'
        print(f'Made ghost more visible at line {i+1}')
        break

# Add new function to create measurement arrows
insert_code = '''
    createMeasurementArrow() {
        if (this.measurementArrow) {
            this.measurementArrow.dispose();
        }
        
        // Create a simple arrow with dashed line
        const arrowMesh = BABYLON.MeshBuilder.CreateLines(measurementArrow, {
            points: [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(1, 0, 0)
            ],
            updatable: true
        }, this.scene);
        
        arrowMesh.color = new BABYLON.Color3(0, 0, 0);
        arrowMesh.isPickable = false;
        this.measurementArrow = arrowMesh;
    }
    
    updateMeasurementArrow(startPos, endPos) {
        if (\!this.measurementArrow) {
            this.createMeasurementArrow();
        }
        
        // Update arrow to point from start to end
        const points = [startPos, endPos];
        this.measurementArrow = BABYLON.MeshBuilder.CreateLines(null, {
            points: points,
            instance: this.measurementArrow
        });
    }
    
    removeMeasurementArrow() {
        if (this.measurementArrow) {
            this.measurementArrow.dispose();
            this.measurementArrow = null;
        }
    }

'''

# Find a good place to insert the measurement arrow functions
for i in range(len(lines)):
    if 'removeGhostMesh() {' in lines[i]:
        # Insert before removeGhostMesh
        lines.insert(i, insert_code)
        print(f'Added measurement arrow functions at line {i+1}')
        break

# Now modify the drag observables to move ghost instead of real mesh
# We need to prevent the real mesh from moving during drag
for i in range(len(lines)):
    if 'this.positionGizmo.xGizmo.dragBehavior.onDragObservable.add' in lines[i]:
        # Find the handler content
        for j in range(i+1, min(i+10, len(lines))):
            if 'const mesh = this.positionGizmo.attachedMesh;' in lines[j]:
                # Replace the drag handler
                indent = ' ' * 16
                new_handler = f'''                this.positionGizmo.xGizmo.dragBehavior.onDragObservable.add(() => {{
                    const mesh = this.positionGizmo.attachedMesh;
                    if (mesh && this.transformStartPosition && this.ghostMesh) {{
                        // Calculate delta but don't apply to real mesh
                        const currentPos = mesh.position.clone();
                        const delta = currentPos.subtract(this.transformStartPosition);
                        
                        // Move ghost instead of real mesh
                        this.ghostMesh.position = currentPos.clone();
                        
                        // Reset real mesh to original position
                        mesh.position = this.transformStartPosition.clone();
                        
                        // Update display at midpoint
                        const midpoint = this.transformStartPosition.add(currentPos).scale(0.5);
                        this.updateTransformDisplay(delta, 'position', midpoint);
                        
                        // Update measurement arrow
                        this.updateMeasurementArrow(this.transformStartPosition, currentPos);
                    }}
                }});
'''
                # Find the end of this handler
                handler_end = j
                brace_count = 0
                for k in range(j, min(j+20, len(lines))):
                    if '{' in lines[k]:
                        brace_count += lines[k].count('{')
                    if '}' in lines[k]:
                        brace_count -= lines[k].count('}')
                        if brace_count <= 0:
                            handler_end = k + 1
                            break
                
                lines[i:handler_end] = [new_handler]
                print(f'Modified X axis drag handler at line {i+1}')
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Updated preview system for X axis')

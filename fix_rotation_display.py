#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Add rotation drag tracking for each axis
for axis in ['x', 'y', 'z']:
    # Find the drag start handler
    pattern = f'this.rotationGizmo.{axis}Gizmo.dragBehavior.onDragStartObservable.add'
    idx = content.find(pattern)
    if idx > 0:
        # Add isDragging flag
        ghost_line = content.find('this.createGhostMesh(mesh);', idx, idx + 500)
        if ghost_line > 0:
            end_of_line = content.find('\n', ghost_line)
            if 'this.isDragging = true;' not in content[ghost_line:end_of_line+100]:
                content = content[:end_of_line] + '\n                        this.isDragging = true;' + content[end_of_line:]
    
    # Add drag observable for real-time updates
    drag_end_pattern = f'this.rotationGizmo.{axis}Gizmo.dragBehavior.onDragEndObservable.add'
    end_idx = content.find(drag_end_pattern, idx)
    if end_idx > idx:
        # Insert drag observable before drag end
        drag_observer = f'''
                this.rotationGizmo.{axis}Gizmo.dragBehavior.onDragObservable.add(() => {{
                    const mesh = this.rotationGizmo.attachedMesh;
                    if (mesh && this.transformStartRotation) {{
                        const delta = mesh.rotation.subtract(this.transformStartRotation);
                        this.updateTransformDisplay(delta, 'rotation');
                    }}
                }});
                '''
        content = content[:end_idx] + drag_observer + '\n                ' + content[end_idx:]

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Added rotation drag tracking')

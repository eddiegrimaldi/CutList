#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Fix 1: Set rotation gizmo to not move with mesh (keep it stationary)
for i in range(len(lines)):
    # Find where rotation gizmo is set to track mesh position
    if 'this.rotationGizmo.updateGizmoPositionToMatchAttachedMesh = true;' in lines[i]:
        # Check if this is not inside a position/scale gizmo section
        context = ''.join(lines[max(0, i-10):i])
        if 'rotationGizmo.attachedMesh = mesh;' in context or 'Rotation Gizmo' in context:
            lines[i] = lines[i].replace('= true;', '= false;')
            print(f'Fixed line {i+1}: Set rotation gizmo to not track mesh position')
    
    # Fix 2: Add ground plane enforcement after rotation ends
    if 'this.rotationGizmo' in lines[i] and 'onDragEndObservable.add' in lines[i]:
        # Find the mesh.refreshBoundingInfo() line
        for j in range(i, min(i+15, len(lines))):
            if 'mesh.refreshBoundingInfo();' in lines[j]:
                # Add ground plane enforcement after refreshBoundingInfo
                indent = ' ' * (len(lines[j]) - len(lines[j].lstrip()))
                ground_constraint = f'''
{indent}// Enforce ground plane constraint - nothing below y=0
{indent}mesh.computeWorldMatrix(true);
{indent}const bounds = mesh.getBoundingInfo().boundingBox;
{indent}const worldMatrix = mesh.getWorldMatrix();
{indent}const minWorldY = BABYLON.Vector3.TransformCoordinates(bounds.minimumWorld, worldMatrix).y;
{indent}if (minWorldY < 0) {{
{indent}    mesh.position.y -= minWorldY;
{indent}}}
'''
                lines[j] = lines[j] + ground_constraint
                print(f'Added ground plane constraint after line {j+1}')
                break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Fixed rotation gizmo behavior and added ground plane constraint')

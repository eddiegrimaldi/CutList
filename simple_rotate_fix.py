#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find the rotate onDrag handler around line 11046
for i in range(11040, 11055):
    if 'rotationGizmo.xGizmo.dragBehavior.onDragObservable' in lines[i]:
        # Check the next few lines
        for j in range(i+1, i+6):
            if 'const delta = mesh.rotation.subtract' in lines[j]:
                # This is the one that just calculates delta
                # Change it to work like move tool
                lines[j] = '''                        // Work like move tool - let gizmo rotate, copy to ghost, reset original
                        const currentRot = mesh.rotation.clone();
                        const delta = currentRot.subtract(this.transformStartRotation);
                        
                        // Copy rotation to ghost
                        if (this.ghostMesh) {
                            this.ghostMesh.rotation = currentRot.clone();
                            // Reset original to start position
                            mesh.rotation = this.transformStartRotation.clone();
                        }
                        
'''
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Fixed rotate to match move behavior")

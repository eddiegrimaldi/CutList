#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Store the last drag position to calculate proper delta
# Add a property to track last position after gizmo creation
for i in range(10830, 10835):
    if 'this.positionGizmo = new BABYLON.PositionGizmo' in lines[i]:
        lines[i] = '''            this.positionGizmo = new BABYLON.PositionGizmo(this.gizmoUtilityLayer);
            this.lastDragPosition = null; // Track last drag position for delta calculation
'''
        break

# Fix X axis drag to use manual delta
for i in range(10860, 10875):
    if '// Dampen movement significantly' in lines[i]:
        # Replace the dampening code with proper delta calculation
        for j in range(i, i+10):
            if 'mesh.position.copyFrom(currentPos);' in lines[j]:
                lines[i:j+1] = ['''                        // Manual position control with sensitivity
                        const rawPos = mesh.position.clone();
                        
                        if (\!this.lastDragPosition) {
                            this.lastDragPosition = this.transformStartPosition.clone();
                        }
                        
                        // Calculate small delta from last position
                        const delta = rawPos.subtract(this.lastDragPosition).scale(0.05); // 5% of movement
                        const newPos = this.lastDragPosition.add(delta);
                        
                        mesh.position.copyFrom(newPos);
                        this.lastDragPosition = newPos.clone();
                        
                        const currentPos = newPos;
''']
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Added manual position control")

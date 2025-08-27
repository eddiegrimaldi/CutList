#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Add minimal debug logging for Y-axis only
old_update_drag = """        // Apply constraints based on handle type
        if (this.activeHandle.type === 'axis') {
            // Project movement onto axis
            const movement = newPosition.subtract(this.dragStartPosition);
            const axisMovement = BABYLON.Vector3.Dot(movement, this.activeHandle.direction);
            newPosition = this.dragStartPosition.add(
                this.activeHandle.direction.scale(axisMovement)
            );"""

new_update_drag = """        // Apply constraints based on handle type
        if (this.activeHandle.type === 'axis') {
            // Project movement onto axis
            const movement = newPosition.subtract(this.dragStartPosition);
            const axisMovement = BABYLON.Vector3.Dot(movement, this.activeHandle.direction);
            
            // Debug Y-axis only
            if (this.activeHandle.name === 'y') {
                console.log('Y-drag: Start Y:', this.dragStartPosition.y.toFixed(2), 
                           'Movement:', axisMovement.toFixed(2), 
                           'New Y:', (this.dragStartPosition.y + axisMovement).toFixed(2));
            }
            
            newPosition = this.dragStartPosition.add(
                this.activeHandle.direction.scale(axisMovement)
            );"""

# Replace
if old_update_drag in content:
    content = content.replace(old_update_drag, new_update_drag)
    print("Added Y-axis debug logging")
else:
    print("Warning: Could not find exact code block")

# Also add the Y constraint back with better logic
old_apply_position = """        // Apply position
        this.targetMesh.position = newPosition;
        this.updateGizmoPosition();"""

new_apply_position = """        // Apply Y-axis constraint - boards sit ON the grid (Y=0 is bottom of board)
        // But allow boards that are already elevated to move down TO the grid
        const minY = 0;
        if (newPosition.y < minY) {
            newPosition.y = minY;
        }
        
        // Apply position
        this.targetMesh.position = newPosition;
        this.updateGizmoPosition();"""

if old_apply_position in content:
    content = content.replace(old_apply_position, new_apply_position)
    print("Added Y-axis constraint")

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Debug logging added")
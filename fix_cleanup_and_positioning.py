#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# 1. Fix the Enter key handler to properly clean up
old_enter_handler = '''                display.style.display = 'none';
                if (self.removeGhostMesh) self.removeGhostMesh();
                self.currentDragAxis = null;
                self.transformType = null;'''

new_enter_handler = '''                // Force cleanup
                display.style.display = 'none';
                display.blur(); // Remove focus
                
                // Remove ghost mesh
                if (self.ghostMesh) {
                    self.ghostMesh.dispose();
                    self.ghostMesh = null;
                }
                
                // Reset all tracking
                self.currentDragAxis = null;
                self.transformType = null;
                self.isDragging = false;
                self.transformStartPosition = null;
                self.transformStartRotation = null;'''

content = content.replace(old_enter_handler, new_enter_handler)

# 2. Also ensure the display is properly hidden after use
# Add a hideTransformDisplay call
hide_addition = '''
    hideTransformDisplay() {
        if (this.transformDisplay) {
            this.transformDisplay.style.display = 'none';
            this.transformDisplay.blur();
        }
        // Also clean up ghost
        if (this.ghostMesh) {
            this.ghostMesh.dispose();
            this.ghostMesh = null;
        }
    }'''

# Check if hideTransformDisplay exists, if not add it
if 'hideTransformDisplay()' not in content:
    # Add after updateTransformDisplay
    update_idx = content.find('updateTransformDisplay(value, type)')
    if update_idx > 0:
        # Find the end of updateTransformDisplay
        method_end = content.find('}\n    ', update_idx)
        next_method = content.find('}\n\n    ', update_idx)
        if next_method > 0 and next_method < method_end:
            method_end = next_method
        if method_end > 0:
            content = content[:method_end+1] + hide_addition + content[method_end+1:]

# 3. Update positioning to be much closer/inside the rotation arc
old_positioning = '''            // For rotation, position in the middle of the rotation arc
            // For position, offset from the gizmo
            if (type === 'rotation') {
                // Position based on which axis is rotating
                let offsetX = 0, offsetY = 0;
                if (axis === 'x') {
                    offsetX = 0;
                    offsetY = -60;  // Above
                } else if (axis === 'y') {
                    offsetX = 60;   // To the right
                    offsetY = 0;
                } else if (axis === 'z') {
                    offsetX = 45;   // Diagonal
                    offsetY = -45;
                }
                this.transformDisplay.style.left = (coordinates.x + offsetX) + 'px';
                this.transformDisplay.style.top = (coordinates.y + offsetY) + 'px';
            } else {'''

new_positioning = '''            // For rotation, position inside or very close to the arc
            // For position, offset from the gizmo
            if (type === 'rotation') {
                // Position based on which axis is rotating - much closer
                let offsetX = 0, offsetY = 0;
                if (axis === 'x') {
                    offsetX = 0;
                    offsetY = -25;  // Just above, inside the arc
                } else if (axis === 'y') {
                    offsetX = 25;   // Close to the right side
                    offsetY = 0;
                } else if (axis === 'z') {
                    offsetX = 18;   // Inside the diagonal arc
                    offsetY = -18;
                }
                this.transformDisplay.style.left = (coordinates.x + offsetX) + 'px';
                this.transformDisplay.style.top = (coordinates.y + offsetY) + 'px';
            } else {'''

content = content.replace(old_positioning, new_positioning)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Fixed cleanup and positioning')

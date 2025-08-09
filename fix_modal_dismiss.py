#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Find the confirm button handler and fix it
# The issue is likely that 'this' context is lost in arrow function
old_confirm = '''        // Handle confirm
        document.getElementById('transform-confirm').onclick = () => {
            const newValue = parseFloat(document.getElementById('transform-value').value);
            
            if (type === 'position') {
                const newPos = this.transformStartPosition.clone();
                newPos[axis] += newValue;
                mesh.position = newPos;
            } else if (type === 'rotation') {
                const newRot = this.transformStartRotation.clone();
                newRot[axis] += newValue * Math.PI / 180;
                mesh.rotation = newRot;
            }
            
            // Update part data
            if (mesh.partData) {
                mesh.partData.position = mesh.position.asArray();
                mesh.partData.rotation = mesh.rotation.asArray();
                this.autosave();
            }
            
            // Clean up
            this.removeGhostMesh();
            this.currentDragAxis = null;
            modal.remove();
        };'''

new_confirm = '''        // Store reference to this for use in handlers
        const self = this;
        
        // Handle confirm
        document.getElementById('transform-confirm').onclick = () => {
            const newValue = parseFloat(document.getElementById('transform-value').value);
            
            if (type === 'position') {
                const newPos = self.transformStartPosition.clone();
                newPos[axis] += newValue;
                mesh.position = newPos;
            } else if (type === 'rotation') {
                const newRot = self.transformStartRotation.clone();
                newRot[axis] += newValue * Math.PI / 180;
                mesh.rotation = newRot;
            }
            
            // Update part data
            if (mesh.partData) {
                mesh.partData.position = mesh.position.asArray();
                mesh.partData.rotation = mesh.rotation.asArray();
                self.autosave();
            }
            
            // Clean up
            if (self.removeGhostMesh) {
                self.removeGhostMesh();
            }
            self.currentDragAxis = null;
            modal.remove();
        };'''

# Replace the confirm handler
content = content.replace(old_confirm, new_confirm)

# Also update the Enter key handler to prevent default and ensure it works
old_enter = '''            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('transform-confirm').click();
                }
            });'''

new_enter = '''            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('transform-confirm').click();
                }
            });'''

content = content.replace(old_enter, new_enter)

# Also fix the cancel handler to use self
old_cancel = '''        // Handle cancel
        document.getElementById('transform-cancel').onclick = () => {
            // Restore original position/rotation
            if (type === 'position') {
                mesh.position = this.transformStartPosition.clone();
            } else if (type === 'rotation') {
                mesh.rotation = this.transformStartRotation.clone();
            }
            
            // Clean up
            this.removeGhostMesh();
            this.currentDragAxis = null;
            modal.remove();
        };'''

new_cancel = '''        // Handle cancel
        document.getElementById('transform-cancel').onclick = () => {
            // Restore original position/rotation
            if (type === 'position') {
                mesh.position = self.transformStartPosition.clone();
            } else if (type === 'rotation') {
                mesh.rotation = self.transformStartRotation.clone();
            }
            
            // Clean up
            if (self.removeGhostMesh) {
                self.removeGhostMesh();
            }
            self.currentDragAxis = null;
            modal.remove();
        };'''

content = content.replace(old_cancel, new_cancel)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Fixed modal dismiss issues')

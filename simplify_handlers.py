#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Replace the entire confirm handler with a simpler version
old_confirm_pattern = '''        document.getElementById('transform-confirm').onclick = () => {
            console.log('Confirm clicked, value:', document.getElementById('transform-value').value);
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
            try {
                if (self.removeGhostMesh) {
                    self.removeGhostMesh();
                }
            } catch (e) {
                console.error('Error removing ghost mesh:', e);
            }
            self.currentDragAxis = null;
            console.log('Removing modal...');
            modal.remove();
            console.log('Modal removed');
        };'''

# Simpler version that should definitely work
new_confirm = '''        document.getElementById('transform-confirm').onclick = function() {
            console.log('Confirm button clicked');
            const inputValue = document.getElementById('transform-value').value;
            const newValue = parseFloat(inputValue);
            console.log('Parsed value:', newValue);
            
            try {
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
                    if (self.autosave) {
                        self.autosave();
                    }
                }
                
                // Clean up
                if (self.removeGhostMesh) {
                    try {
                        self.removeGhostMesh();
                    } catch (e) {
                        console.error('Ghost mesh error:', e);
                    }
                }
                self.currentDragAxis = null;
                
            } catch (error) {
                console.error('Error in confirm handler:', error);
            }
            
            // Always remove modal
            console.log('About to remove modal');
            modal.parentNode.removeChild(modal);
            console.log('Modal removed');
        };'''

content = content.replace(old_confirm_pattern, new_confirm)

# Also fix the Enter key handler
old_enter = '''            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('transform-confirm').click();
                }
            });'''

new_enter = '''            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Enter key pressed');
                    const confirmBtn = document.getElementById('transform-confirm');
                    if (confirmBtn) {
                        confirmBtn.click();
                    }
                }
            });'''

content = content.replace(old_enter, new_enter)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print('Simplified handlers for better reliability')

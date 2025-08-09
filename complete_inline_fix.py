#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find and completely replace createTransformDisplay
for i, line in enumerate(lines):
    if 'createTransformDisplay()' in line and i > 12000:
        # Find the end of this method
        brace_count = 0
        start_idx = i
        for j in range(i, len(lines)):
            brace_count += lines[j].count('{')
            brace_count -= lines[j].count('}')
            if brace_count == 0 and j > i:
                end_idx = j + 1
                break
        
        # Complete replacement with working version
        new_method = '''    createTransformDisplay() {
        // Remove any existing display
        if (this.transformDisplay) {
            this.transformDisplay.remove();
            this.transformDisplay = null;
        }
        
        // Create minimal inline input
        const display = document.createElement('input');
        display.id = 'transform-display';
        display.type = 'number';
        display.style.position = 'fixed'; // Use fixed positioning
        display.style.width = '60px';
        display.style.padding = '2px';
        display.style.background = 'white';
        display.style.border = '2px solid #4CAF50';
        display.style.borderRadius = '3px';
        display.style.fontSize = '12px';
        display.style.fontWeight = 'bold';
        display.style.textAlign = 'center';
        display.style.display = 'none';
        display.style.zIndex = '100000'; // Very high z-index
        display.step = '0.25';
        
        document.body.appendChild(display);
        this.transformDisplay = display;
        
        // Store reference to this
        const self = this;
        
        // Handle Enter key with function (not arrow)
        display.addEventListener('keydown', function(evt) {
            if (evt.key === 'Enter' || evt.keyCode === 13) {
                evt.preventDefault();
                evt.stopPropagation();
                
                console.log('Enter pressed in transform display');
                
                const value = parseFloat(this.value);
                const mesh = self.positionGizmo?.attachedMesh || self.rotationGizmo?.attachedMesh;
                
                if (mesh && \!isNaN(value)) {
                    console.log('Applying value:', value, 'to', self.transformType, 'axis:', self.currentDragAxis);
                    
                    if (self.transformType === 'position') {
                        const newPos = self.transformStartPosition.clone();
                        newPos[self.currentDragAxis] = self.transformStartPosition[self.currentDragAxis] + value;
                        mesh.position = newPos;
                    } else if (self.transformType === 'rotation') {
                        const newRot = self.transformStartRotation.clone();
                        newRot[self.currentDragAxis] = self.transformStartRotation[self.currentDragAxis] + (value * Math.PI / 180);
                        mesh.rotation = newRot;
                    }
                    
                    // Update part data
                    if (mesh.partData) {
                        mesh.partData.position = mesh.position.asArray();
                        mesh.partData.rotation = mesh.rotation.asArray();
                        if (self.autosave) self.autosave();
                    }
                }
                
                // Force cleanup
                this.style.display = 'none';
                this.value = '';
                
                // Clean up ghost
                if (self.ghostMesh) {
                    console.log('Disposing ghost mesh');
                    self.ghostMesh.dispose();
                    self.ghostMesh = null;
                }
                
                // Reset state
                self.currentDragAxis = null;
                self.transformType = null;
                self.isDragging = false;
            }
        });
        
        // Also handle Escape key
        display.addEventListener('keydown', function(evt) {
            if (evt.key === 'Escape' || evt.keyCode === 27) {
                evt.preventDefault();
                
                console.log('Escape pressed - canceling');
                
                // Restore original position
                const mesh = self.positionGizmo?.attachedMesh || self.rotationGizmo?.attachedMesh;
                if (mesh) {
                    if (self.transformType === 'position' && self.transformStartPosition) {
                        mesh.position = self.transformStartPosition.clone();
                    } else if (self.transformType === 'rotation' && self.transformStartRotation) {
                        mesh.rotation = self.transformStartRotation.clone();
                    }
                }
                
                // Force cleanup
                this.style.display = 'none';
                this.value = '';
                
                // Clean up ghost
                if (self.ghostMesh) {
                    self.ghostMesh.dispose();
                    self.ghostMesh = null;
                }
                
                // Reset state
                self.currentDragAxis = null;
                self.transformType = null;
                self.isDragging = false;
            }
        });
    }
'''
        
        # Replace the method
        del lines[start_idx:end_idx]
        lines.insert(start_idx, new_method + '\n')
        print(f'Replaced createTransformDisplay at line {start_idx+1}')
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

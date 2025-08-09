#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# 1. Replace the big transform display with a minimal inline one
old_create_display = '''    createTransformDisplay() {
        // Remove any existing display
        if (this.transformDisplay) {
            this.transformDisplay.remove();
        }
        
        // Create display container
        const display = document.createElement('div');
        display.id = 'transform-display';
        display.style.position = 'fixed';
        display.style.top = '50%';
        display.style.left = '50%';
        display.style.transform = 'translate(-50%, -50%)';
        display.style.background = 'rgba(0, 0, 0, 0.8)';
        display.style.color = 'white';
        display.style.padding = '10px 20px';
        display.style.borderRadius = '5px';
        display.style.fontSize = '24px';
        display.style.fontWeight = 'bold';
        display.style.display = 'none';
        display.style.zIndex = '10000';
        display.style.pointerEvents = 'none';
        document.body.appendChild(display);
        this.transformDisplay = display;
    }'''

new_create_display = '''    createTransformDisplay() {
        // Remove any existing display
        if (this.transformDisplay) {
            this.transformDisplay.remove();
        }
        
        // Create minimal inline input
        const display = document.createElement('input');
        display.id = 'transform-display';
        display.type = 'number';
        display.style.position = 'absolute';
        display.style.width = '80px';
        display.style.padding = '4px 8px';
        display.style.background = 'rgba(255, 255, 255, 0.95)';
        display.style.border = '2px solid #4CAF50';
        display.style.borderRadius = '4px';
        display.style.fontSize = '14px';
        display.style.fontWeight = 'bold';
        display.style.textAlign = 'center';
        display.style.display = 'none';
        display.style.zIndex = '10000';
        display.style.outline = 'none';
        display.step = '0.25';
        
        document.body.appendChild(display);
        this.transformDisplay = display;
        
        // Handle Enter key for inline display
        display.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                e.stopPropagation();
                
                const value = parseFloat(display.value);
                const mesh = this.positionGizmo.attachedMesh || this.rotationGizmo.attachedMesh;
                
                if (mesh && \!isNaN(value)) {
                    if (this.transformType === 'position') {
                        const newPos = this.transformStartPosition.clone();
                        newPos[this.currentDragAxis] = this.transformStartPosition[this.currentDragAxis] + value;
                        mesh.position = newPos;
                    } else if (this.transformType === 'rotation') {
                        const newRot = this.transformStartRotation.clone();
                        newRot[this.currentDragAxis] = this.transformStartRotation[this.currentDragAxis] + (value * Math.PI / 180);
                        mesh.rotation = newRot;
                    }
                    
                    // Update part data
                    if (mesh.partData) {
                        mesh.partData.position = mesh.position.asArray();
                        mesh.partData.rotation = mesh.rotation.asArray();
                        this.autosave();
                    }
                }
                
                // Hide display and clean up
                display.style.display = 'none';
                this.removeGhostMesh();
                this.currentDragAxis = null;
            }
        });
        
        // Handle blur (clicking away)
        display.addEventListener('blur', () => {
            // Apply the value and hide
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            display.dispatchEvent(event);
        });
    }'''

content = content.replace(old_create_display, new_create_display)

# 2. Update the updateTransformDisplay to position near cursor and update value
old_update_display = '''    updateTransformDisplay(value, type) {
        if (\!this.transformDisplay) return;
        
        const axis = this.currentDragAxis || 'x';
        const axisUpper = axis.toUpperCase();
        
        if (type === 'position') {
            const displayValue = value[axis] || 0;
            this.transformDisplay.textContent = 'Move ' + axisUpper + ': ' + displayValue.toFixed(2) + ';
        } else if (type === rotation) {
            const displayValue = (value[axis] || 0) * 180 / Math.PI;
            this.transformDisplay.textContent = Rotate  + axisUpper + :  + displayValue.toFixed(1) + °;
        }
        
        this.transformDisplay.style.display = block;
    }

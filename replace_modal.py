#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find and replace the showTransformConfirmationModal
for i, line in enumerate(lines):
    if 'showTransformConfirmationModal(mesh, transformData, type)' in line:
        # Find the end of this method
        brace_count = 0
        start_idx = i
        for j in range(i, len(lines)):
            brace_count += lines[j].count('{')
            brace_count -= lines[j].count('}')
            if brace_count == 0 and j > i:
                end_idx = j + 1
                break
        
        # Replace with new single-axis modal
        new_modal = '''    showTransformConfirmationModal(mesh, transformData, type) {
        // Ensure we have axis tracking
        if (\!this.currentDragAxis) {
            console.warn('No axis tracked, defaulting to x');
            this.currentDragAxis = 'x';
        }
        
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = 'white';
        modal.style.padding = '20px';
        modal.style.borderRadius = '10px';
        modal.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        modal.style.zIndex = '10001';
        modal.style.minWidth = '250px';
        
        const axis = this.currentDragAxis;
        const axisUpper = axis.toUpperCase();
        let value = 0;
        let content = '';
        
        if (type === 'position') {
            const delta = transformData.subtract(this.transformStartPosition);
            value = delta[axis];
            
            content = '<h3 style="margin-top: 0;">Confirm Movement</h3>';
            content += '<div style="margin-bottom: 10px;">';
            content += '<label>' + axisUpper + ' Axis: ';
            content += '<input type="number" id="transform-value" value="' + value.toFixed(2) + '" step="0.25" style="width: 80px;">';
            content += ' inches</label>';
            content += '</div>';
        } else if (type === 'rotation') {
            const delta = transformData.subtract(this.transformStartRotation);
            value = delta[axis] * 180 / Math.PI;
            
            content = '<h3 style="margin-top: 0;">Confirm Rotation</h3>';
            content += '<div style="margin-bottom: 10px;">';
            content += '<label>' + axisUpper + ' Axis: ';
            content += '<input type="number" id="transform-value" value="' + value.toFixed(1) + '" step="15" style="width: 80px;">';
            content += ' degrees</label>';
            content += '</div>';
        }
        
        content += '<div style="text-align: right; margin-top: 15px;">';
        content += '<button id="transform-cancel" style="margin-right: 10px; padding: 5px 15px;">Cancel</button>';
        content += '<button id="transform-confirm" style="padding: 5px 15px; background: #4CAF50; color: white; border: none; border-radius: 3px;">Confirm</button>';
        content += '</div>';
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
        
        // Focus and select the input
        const input = document.getElementById('transform-value');
        if (input) {
            input.focus();
            input.select();
            
            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('transform-confirm').click();
                }
            });
        }
        
        // Handle confirm
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
        };
        
        // Handle cancel
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
        };
    }
'''
        
        # Replace the method
        del lines[start_idx:end_idx]
        lines.insert(start_idx, new_modal + '\n')
        print(f'Replaced modal at line {start_idx+1}')
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

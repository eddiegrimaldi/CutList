#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find the showTransformConfirmationModal method and replace it
found_method = False
method_start = -1
method_end = -1
brace_count = 0

for i, line in enumerate(lines):
    if 'showTransformConfirmationModal(mesh, transformData, type)' in line:
        found_method = True
        method_start = i
        brace_count = 0
    
    if found_method:
        brace_count += line.count('{')
        brace_count -= line.count('}')
        
        if brace_count == 0 and i > method_start:
            method_end = i + 1
            break

if method_start >= 0 and method_end > 0:
    # Replace the entire method
    new_method = '''    showTransformConfirmationModal(mesh, transformData, type) {
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
        
        let content = '';
        let axisLabel = this.currentDragAxis.toUpperCase();
        let value = 0;
        let unit = '';
        
        if (type === 'position') {
            const delta = transformData.subtract(this.transformStartPosition);
            if (this.currentDragAxis === 'x') value = delta.x;
            else if (this.currentDragAxis === 'y') value = delta.y;
            else if (this.currentDragAxis === 'z') value = delta.z;
            
            unit = ' inches';
            content = '<h3 style="margin-top: 0;">Confirm Movement</h3>';
            content += '<div style="margin-bottom: 10px;">';
            content += '<label>' + axisLabel + ' Axis: ';
            content += '<input type="number" id="transform-value" value="' + value.toFixed(2) + '" step="0.25" style="width: 80px;">';
            content += unit + '</label>';
            content += '</div>';
        } else if (type === 'rotation') {
            const delta = transformData.subtract(this.transformStartRotation);
            if (this.currentDragAxis === 'x') value = delta.x * 180 / Math.PI;
            else if (this.currentDragAxis === 'y') value = delta.y * 180 / Math.PI;
            else if (this.currentDragAxis === 'z') value = delta.z * 180 / Math.PI;
            
            unit = ' degrees';
            content = '<h3 style="margin-top: 0;">Confirm Rotation</h3>';
            content += '<div style="margin-bottom: 10px;">';
            content += '<label>' + axisLabel + ' Axis: ';
            content += '<input type="number" id="transform-value" value="' + value.toFixed(1) + '" step="15" style="width: 80px;">';
            content += unit + '</label>';
            content += '</div>';
        }
        
        content += '<div style="text-align: right; margin-top: 15px;">';
        content += '<button id="transform-cancel" style="margin-right: 10px; padding: 5px 15px;">Cancel</button>';
        content += '<button id="transform-confirm" style="padding: 5px 15px; background: #4CAF50; color: white; border: none; border-radius: 3px;">Confirm</button>';
        content += '</div>';
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
        
        // Focus the input field
        const input = document.getElementById('transform-value');
        if (input) {
            input.focus();
            input.select();
        }
        
        // Handle confirm
        document.getElementById('transform-confirm').onclick = () => {
            const newValue = parseFloat(document.getElementById('transform-value').value);
            
            if (type === 'position') {
                const newPos = this.transformStartPosition.clone();
                if (this.currentDragAxis === 'x') newPos.x += newValue;
                else if (this.currentDragAxis === 'y') newPos.y += newValue;
                else if (this.currentDragAxis === 'z') newPos.z += newValue;
                mesh.position = newPos;
            } else if (type === 'rotation') {
                const newRot = this.transformStartRotation.clone();
                const radValue = newValue * Math.PI / 180;
                if (this.currentDragAxis === 'x') newRot.x += radValue;
                else if (this.currentDragAxis === 'y') newRot.y += radValue;
                else if (this.currentDragAxis === 'z') newRot.z += radValue;
                mesh.rotation = newRot;
            }
            
            // Update part data
            if (mesh.partData) {
                mesh.partData.position = mesh.position.asArray();
                mesh.partData.rotation = mesh.rotation.asArray();
                this.autosave();
            }
            
            this.removeGhostMesh();
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
            
            this.removeGhostMesh();
            modal.remove();
        };
        
        // Handle Enter key to confirm
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('transform-confirm').click();
            }
        });
    }
'''
    
    # Replace the old method with the new one
    del lines[method_start:method_end]
    lines.insert(method_start, new_method + '\n')
    
    with open('drawing-world.js', 'w') as f:
        f.writelines(lines)
    
    print('Updated modal to show only single axis')
else:
    print('Could not find showTransformConfirmationModal method')

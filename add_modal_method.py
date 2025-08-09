#\!/usr/bin/env python3

modal_method = '''
    showTransformConfirmationModal(mesh, transformData, type) {
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
        modal.style.minWidth = '300px';
        
        let content = '';
        if (type === 'position') {
            const delta = transformData.subtract(this.transformStartPosition);
            content = '<h3 style="margin-top: 0;">Confirm Movement</h3>';
            content += '<div style="margin-bottom: 10px;">';
            content += '<label>X: <input type="number" id="transform-x" value="' + delta.x.toFixed(2) + '" step="0.25" style="width: 80px;"> inches</label><br>';
            content += '<label>Y: <input type="number" id="transform-y" value="' + delta.y.toFixed(2) + '" step="0.25" style="width: 80px;"> inches</label><br>';
            content += '<label>Z: <input type="number" id="transform-z" value="' + delta.z.toFixed(2) + '" step="0.25" style="width: 80px;"> inches</label>';
            content += '</div>';
        } else if (type === 'rotation') {
            const delta = transformData.subtract(this.transformStartRotation);
            content = '<h3 style="margin-top: 0;">Confirm Rotation</h3>';
            content += '<div style="margin-bottom: 10px;">';
            content += '<label>X: <input type="number" id="transform-x" value="' + (delta.x * 180 / Math.PI).toFixed(1) + '" step="15" style="width: 80px;"> degrees</label><br>';
            content += '<label>Y: <input type="number" id="transform-y" value="' + (delta.y * 180 / Math.PI).toFixed(1) + '" step="15" style="width: 80px;"> degrees</label><br>';
            content += '<label>Z: <input type="number" id="transform-z" value="' + (delta.z * 180 / Math.PI).toFixed(1) + '" step="15" style="width: 80px;"> degrees</label>';
            content += '</div>';
        }
        
        content += '<div style="text-align: right; margin-top: 15px;">';
        content += '<button id="transform-cancel" style="margin-right: 10px; padding: 5px 15px;">Cancel</button>';
        content += '<button id="transform-confirm" style="padding: 5px 15px; background: #4CAF50; color: white; border: none; border-radius: 3px;">Confirm</button>';
        content += '</div>';
        
        modal.innerHTML = content;
        document.body.appendChild(modal);
        
        // Handle confirm
        document.getElementById('transform-confirm').onclick = () => {
            const x = parseFloat(document.getElementById('transform-x').value);
            const y = parseFloat(document.getElementById('transform-y').value);
            const z = parseFloat(document.getElementById('transform-z').value);
            
            if (type === 'position') {
                mesh.position = this.transformStartPosition.add(new BABYLON.Vector3(x, y, z));
            } else if (type === 'rotation') {
                mesh.rotation = this.transformStartRotation.add(new BABYLON.Vector3(
                    x * Math.PI / 180,
                    y * Math.PI / 180,
                    z * Math.PI / 180
                ));
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
    }
'''

# Read the file
with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find where to insert (before the closing brace of DrawingWorld class)
# Look for the line we just added before
insert_index = None
for i in range(len(lines) - 1, 0, -1):
    if 'applyRotationSnap(rotation)' in lines[i]:
        # Find the closing of this method and insert after
        for j in range(i, len(lines)):
            if lines[j].strip() == '}' and j > i + 5:
                insert_index = j + 1
                break
        break

if insert_index:
    lines.insert(insert_index, modal_method)
    with open('drawing-world.js', 'w') as f:
        f.writelines(lines)
    print('Added modal method successfully')
else:
    print('Could not find insertion point')

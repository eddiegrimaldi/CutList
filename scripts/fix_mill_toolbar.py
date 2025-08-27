#!/usr/bin/env python3
"""
Fix three issues in TheMillSystem.js:
1. Add Move/Rotate toolbar (no perma-gizmos)
2. Fix zoom sensitivity and tie to preferences
3. Fix B view - board not visible
"""

import subprocess

SSH = "ssh -i /home/edgrimaldi/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"
FILE = "/var/www/html/modules/TheMillSystem.js"

print("Creating backup...")
backup_cmd = f'{SSH} "cp {FILE} {FILE}.backup_toolbar_$(date +%s)"'
subprocess.run(backup_cmd, shell=True)

# First, fix the B view by adjusting camera position and zoom
print("\n1. Fixing B view - adjusting camera for board visibility...")

# Create a Python script on the server to make the changes
fix_script = '''
import re

with open('/var/www/html/modules/TheMillSystem.js', 'r') as f:
    content = f.read()

# Fix 1: B view - Adjust camera position and zoom
# Find the switchToBladeProfileView function and fix it
blade_view_pattern = r'(switchToBladeProfileView\\(\\) {[^}]*const orthoSize = )25(.*?)(\n        this\\.millCamera\\.orthoLeft)'
replacement = r'\\g<1>60\\g<2>\\n        // Ensure camera looks at board center\\n        this.millCamera.setTarget(BABYLON.Vector3.Zero());\\g<3>'
content = re.sub(blade_view_pattern, replacement, content, flags=re.DOTALL)

# Fix 2: Add toolbar creation in setupMillScene
toolbar_code = """
        // Create transform toolbar (no perma-gizmos)
        this.createTransformToolbar();
"""

# Insert after the grid creation
grid_pattern = r'(this\\.createGrid\\(\\);)'
content = re.sub(grid_pattern, r'\\1' + toolbar_code, content)

# Fix 3: Add zoom sensitivity from preferences
zoom_fix = """
        // Get zoom sensitivity from preferences
        const zoomSensitivity = window.userPreferences?.zoomSensitivity || 0.001;
        
        this.millCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (this.millCamera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
                const delta = e.deltaY * zoomSensitivity;
                const currentSize = Math.abs(this.millCamera.orthoRight - this.millCamera.orthoLeft);
                const newSize = Math.max(10, Math.min(500, currentSize + delta));
                const aspectRatio = this.millCanvas.width / this.millCanvas.height;
                
                this.millCamera.orthoLeft = -newSize / 2;
                this.millCamera.orthoRight = newSize / 2;
                this.millCamera.orthoTop = newSize / (2 * aspectRatio);
                this.millCamera.orthoBottom = -newSize / (2 * aspectRatio);
            } else {
                const delta = e.deltaY * zoomSensitivity * 10;
                this.millCamera.radius = Math.max(10, Math.min(500, this.millCamera.radius + delta));
            }
        });
"""

# Replace existing wheel event listener
wheel_pattern = r'(this\\.millCanvas\\.addEventListener\\([\\'"]wheel[\\'"], \\(e\\) => {[^}]+}\\);)'
content = re.sub(wheel_pattern, zoom_fix, content, flags=re.DOTALL)

with open('/var/www/html/modules/TheMillSystem.js', 'w') as f:
    f.write(content)
'''

apply_cmd = f'{SSH} "cat > /tmp/fix_mill.py << \'EOF\'\n{fix_script}\nEOF\npython3 /tmp/fix_mill.py"'
subprocess.run(apply_cmd, shell=True)

# Now add the createTransformToolbar function
print("\n2. Adding transform toolbar...")

toolbar_function = '''
    
    createTransformToolbar() {
        // Create toolbar container
        const toolbar = document.createElement('div');
        toolbar.id = 'mill-transform-toolbar';
        toolbar.style.cssText = `
            position: absolute;
            top: 100px;
            right: 20px;
            background: rgba(50, 50, 50, 0.9);
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 1000;
        `;
        
        // Move button
        const moveBtn = this.createToolbarButton('Move', () => {
            this.clearGizmos();
            if (this.currentBoard) {
                const gizmoManager = new BABYLON.GizmoManager(this.millScene);
                gizmoManager.positionGizmoEnabled = true;
                gizmoManager.attachToMesh(this.currentBoard);
                this.currentGizmo = gizmoManager;
            }
        });
        
        // Rotate button with dropdown
        const rotateContainer = document.createElement('div');
        rotateContainer.style.position = 'relative';
        
        const rotateBtn = this.createToolbarButton('Rotate ▼', () => {
            const dropdown = rotateContainer.querySelector('.rotate-dropdown');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            }
        });
        
        // Rotate dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'rotate-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: rgba(40, 40, 40, 0.95);
            border-radius: 4px;
            padding: 5px;
            display: none;
            min-width: 120px;
            margin-top: 2px;
        `;
        
        // Rotate gizmo option
        const rotateGizmoBtn = this.createToolbarButton('Rotate', () => {
            this.clearGizmos();
            if (this.currentBoard) {
                const gizmoManager = new BABYLON.GizmoManager(this.millScene);
                gizmoManager.rotationGizmoEnabled = true;
                // Restrict to Y-axis rotation only
                gizmoManager.gizmos.rotationGizmo.xGizmo.isEnabled = false;
                gizmoManager.gizmos.rotationGizmo.zGizmo.isEnabled = false;
                gizmoManager.attachToMesh(this.currentBoard);
                this.currentGizmo = gizmoManager;
            }
            dropdown.style.display = 'none';
        });
        
        // Flip 90 right
        const flip90RightBtn = this.createToolbarButton('Flip 90° →', () => {
            if (this.currentBoard) {
                this.currentBoard.rotation.x += Math.PI / 2;
            }
            dropdown.style.display = 'none';
        });
        
        // Flip 90 left  
        const flip90LeftBtn = this.createToolbarButton('Flip 90° ←', () => {
            if (this.currentBoard) {
                this.currentBoard.rotation.x -= Math.PI / 2;
            }
            dropdown.style.display = 'none';
        });
        
        dropdown.appendChild(rotateGizmoBtn);
        dropdown.appendChild(flip90RightBtn);
        dropdown.appendChild(flip90LeftBtn);
        
        rotateContainer.appendChild(rotateBtn);
        rotateContainer.appendChild(dropdown);
        
        // Clear button (removes active gizmos)
        const clearBtn = this.createToolbarButton('Clear', () => {
            this.clearGizmos();
        });
        
        toolbar.appendChild(moveBtn);
        toolbar.appendChild(rotateContainer);
        toolbar.appendChild(clearBtn);
        
        const container = document.getElementById('mill-container');
        if (container) {
            container.appendChild(toolbar);
        }
    }
    
    createToolbarButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 8px 16px;
            background: rgba(70, 70, 70, 0.9);
            color: white;
            border: 1px solid rgba(100, 100, 100, 0.5);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            min-width: 100px;
            text-align: left;
        `;
        btn.onmouseover = () => btn.style.background = 'rgba(90, 90, 90, 0.9)';
        btn.onmouseout = () => btn.style.background = 'rgba(70, 70, 70, 0.9)';
        btn.onclick = onClick;
        return btn;
    }
    
    clearGizmos() {
        if (this.currentGizmo) {
            this.currentGizmo.dispose();
            this.currentGizmo = null;
        }
    }
'''

# Add the toolbar functions before the closing bracket of the class
add_toolbar_cmd = f"""{SSH} "cat >> /tmp/toolbar_funcs.txt << 'EOFMARKER'
{toolbar_function}
EOFMARKER
" """
subprocess.run(add_toolbar_cmd, shell=True)

# Insert the functions into the file
insert_cmd = f'''{SSH} "python3 -c \\"
import re

with open('/var/www/html/modules/TheMillSystem.js', 'r') as f:
    content = f.read()

# Find the last method of the class (before the closing brace)
# Insert our new methods before the final closing brace
pattern = r'(updateBladeTilt\\\\(\\\\)[^}]*}[^}]*})(\\\\s*}\\\\s*export)'
toolbar_code = open('/tmp/toolbar_funcs.txt', 'r').read()
replacement = r'\\\\1' + toolbar_code + r'\\\\2'
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('/var/www/html/modules/TheMillSystem.js', 'w') as f:
    f.write(content)
\\""'''
subprocess.run(insert_cmd, shell=True)

print("\n3. Testing syntax...")
test_cmd = f'{SSH} "node -c {FILE} 2>&1"'
result = subprocess.run(test_cmd, shell=True, capture_output=True, text=True)
if result.returncode == 0:
    print("✓ Syntax valid!")
else:
    print("✗ Syntax error:")
    print(result.stderr)

print("\nDone! Refresh browser to test.")
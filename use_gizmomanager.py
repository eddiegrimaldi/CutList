#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Find the section where gizmos are created (around line 10825)
# Replace the entire gizmo creation and attachment section
import re

# Replace the complex gizmo creation with simple GizmoManager
old_pattern = r'// Create gizmos directly without GizmoManager[\s\S]*?console\.log\(\'Attached scale gizmo to mesh\'\);'

new_code = '''// Use GizmoManager - it handles everything\!
        if (\!this.gizmoManager) {
            this.gizmoManager = new BABYLON.GizmoManager(this.scene);
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled = false;
            this.gizmoManager.boundingBoxGizmoEnabled = false;
            console.log('Created GizmoManager');
        }
        
        // Attach to mesh and enable the right gizmo based on active tool
        this.gizmoManager.attachToMesh(mesh);
        
        if (this.activeTool === 'move') {
            this.gizmoManager.positionGizmoEnabled = true;
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled = false;
            console.log('Enabled position gizmo');
        } else if (this.activeTool === 'rotate') {
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.rotationGizmoEnabled = true;
            this.gizmoManager.scaleGizmoEnabled = false;
            console.log('Enabled rotation gizmo');
        } else if (this.activeTool === 'scale') {
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled = true;
            console.log('Enabled scale gizmo');'''

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

with open('drawing-world.js', 'w') as f:
    f.write(content)

print("Replaced manual gizmos with GizmoManager")

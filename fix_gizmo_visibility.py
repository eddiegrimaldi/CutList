#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Add gizmo configuration after creation
for i in range(10825, 10860):
    if 'console.log(\'Created GizmoManager\');' in lines[i]:
        lines[i] = '''            console.log('Created GizmoManager');
            
            // Configure gizmo visibility and size
            this.gizmoManager.scaleRatio = 1.5; // Make gizmos larger
            this.gizmoManager.usePointerToAttachGizmos = false; // Don't auto-attach on click
            
            // Set thickness for better visibility
            this.gizmoManager.gizmos.positionGizmo = null;
            this.gizmoManager.gizmos.rotationGizmo = null;
            this.gizmoManager.gizmos.scaleGizmo = null;
'''
        break

# Also ensure we're actually calling the gizmo setup
for i in range(10838, 10855):
    if 'if (this.activeTool === \'move\')' in lines[i]:
        lines[i] = '''        if (this.activeTool === 'move') {
            this.gizmoManager.positionGizmoEnabled = true;
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled = false;
            
            // Force create and configure position gizmo
            if (this.gizmoManager.gizmos.positionGizmo) {
                this.gizmoManager.gizmos.positionGizmo.scaleRatio = 1.5;
                this.gizmoManager.gizmos.positionGizmo.updateGizmoPositionToMatchAttachedMesh = true;
            }
            
            console.log('Enabled position gizmo', this.gizmoManager.gizmos.positionGizmo);
'''
        break

# Do same for rotate and scale
for i in range(10845, 10860):
    if 'else if (this.activeTool === \'rotate\')' in lines[i]:
        lines[i] = '''        } else if (this.activeTool === 'rotate') {
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.rotationGizmoEnabled = true;
            this.gizmoManager.scaleGizmoEnabled = false;
            
            // Force create and configure rotation gizmo
            if (this.gizmoManager.gizmos.rotationGizmo) {
                this.gizmoManager.gizmos.rotationGizmo.scaleRatio = 1.5;
                this.gizmoManager.gizmos.rotationGizmo.updateGizmoPositionToMatchAttachedMesh = true;
            }
            
            console.log('Enabled rotation gizmo', this.gizmoManager.gizmos.rotationGizmo);
'''
        break

for i in range(10850, 10865):
    if 'else if (this.activeTool === \'scale\')' in lines[i]:
        lines[i] = '''        } else if (this.activeTool === 'scale') {
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled = true;
            
            // Force create and configure scale gizmo
            if (this.gizmoManager.gizmos.scaleGizmo) {
                this.gizmoManager.gizmos.scaleGizmo.scaleRatio = 1.5;
                this.gizmoManager.gizmos.scaleGizmo.updateGizmoPositionToMatchAttachedMesh = true;
            }
            
            console.log('Enabled scale gizmo', this.gizmoManager.gizmos.scaleGizmo);
'''
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Added gizmo visibility configuration")

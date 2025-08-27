#!/usr/bin/env python3
import re

# Read the current file
with open('/var/www/html/drawing-world.js', 'r') as f:
    content = f.read()

# Fix 1: Add Y-axis constraint only (simplest fix)
old_apply_position = """        // Apply position
        this.targetMesh.position = newPosition;
        this.updateGizmoPosition();"""

new_apply_position = """        // Apply Y-axis constraint - never go below Y=0 (grid plane)
        if (newPosition.y < 0) {
            newPosition.y = 0;
        }
        
        // Apply position
        this.targetMesh.position = newPosition;
        this.updateGizmoPosition();"""

# Replace position application
if old_apply_position in content:
    content = content.replace(old_apply_position, new_apply_position)
    print("Added Y-axis constraint")
else:
    print("Warning: Could not find position application")

# Fix 2: Make gizmo event handling take priority by registering it with higher priority
# Find where observable is registered
old_observable_registration = """        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo);
                    break;"""

new_observable_registration = """        // Register with priority to handle events before other systems
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    // If gizmo is active and we hit it, consume the event
                    if (this.gizmoRoot && this.gizmoRoot.isEnabled()) {
                        const pickInfo = this.scene.pick(
                            this.scene.pointerX,
                            this.scene.pointerY,
                            (mesh) => mesh && mesh.isGizmo === true
                        );
                        
                        if (pickInfo.hit && pickInfo.pickedMesh && pickInfo.pickedMesh.isGizmo) {
                            this.handlePointerDown(pointerInfo);
                            pointerInfo.skipOnPointerObservable = true; // Skip other handlers
                            return;
                        }
                    }
                    this.handlePointerDown(pointerInfo);
                    break;"""

# Try to replace the observable registration
if old_observable_registration in content:
    content = content.replace(old_observable_registration, new_observable_registration)
    print("Fixed observable priority")
else:
    print("Warning: Could not find exact observable registration")

# Write the fixed content
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.write(content)

print("Simple fixes applied")
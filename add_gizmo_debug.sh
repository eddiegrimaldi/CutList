#\!/bin/bash

# Add debug logging at the start of createDragHandles
sed -i '/createDragHandles(mesh) {/a\
        console.log("🎯 createDragHandles called with mesh:", mesh?.name, "Tool:", this.activeTool);\
        console.log("GizmoManager exists?", \!\!this.gizmoManager);' drawing-world.js

# Add debug after attachment
sed -i '/this.gizmoManager.attachToMesh(mesh);/a\
        console.log("📎 Attached to mesh:", this.gizmoManager.attachedMesh?.name);\
        console.log("Position enabled:", this.gizmoManager.positionGizmoEnabled);\
        console.log("Rotation enabled:", this.gizmoManager.rotationGizmoEnabled);\
        console.log("Scale enabled:", this.gizmoManager.scaleGizmoEnabled);' drawing-world.js

echo Added gizmo debugging

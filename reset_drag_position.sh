#\!/bin/bash

# Add reset of lastDragPosition in drag end handlers
sed -i '/positionGizmo.xGizmo.dragBehavior.onDragEndObservable/,/});/ {
    /this.removeGhostMesh();/a                        this.lastDragPosition = null; // Reset for next drag
}' drawing-world.js

echo Added drag position reset

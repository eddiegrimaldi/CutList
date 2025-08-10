#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Add sensitivity factor right after gizmo creation
for i in range(10830, 10850):
    if 'this.positionGizmo.scaleRatio = 0.7' in lines[i]:
        lines[i] = '''            this.positionGizmo.scaleRatio = 0.7; // Visual size
            
            // CRITICAL: Reduce drag sensitivity after behaviors are created
            setTimeout(() => {
                if (this.positionGizmo.xGizmo && this.positionGizmo.xGizmo.dragBehavior) {
                    const originalMoveX = this.positionGizmo.xGizmo.dragBehavior.onDragObservable.observers[0].callback;
                    this.positionGizmo.xGizmo.dragBehavior.moveAttached = false; // Don't auto-move
                }
                if (this.positionGizmo.yGizmo && this.positionGizmo.yGizmo.dragBehavior) {
                    this.positionGizmo.yGizmo.dragBehavior.moveAttached = false;
                }
                if (this.positionGizmo.zGizmo && this.positionGizmo.zGizmo.dragBehavior) {
                    this.positionGizmo.zGizmo.dragBehavior.moveAttached = false;
                }
            }, 100);
'''
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Disabled auto-move on position gizmo")

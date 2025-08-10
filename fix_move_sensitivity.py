#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Add sensitivity control to position gizmo
for i in range(10830, 10840):
    if 'this.positionGizmo.scaleRatio = 1.0;' in lines[i]:
        lines[i] = '''            this.positionGizmo.scaleRatio = 1.0;
            
            // Reduce drag sensitivity
            if (this.positionGizmo.xGizmo && this.positionGizmo.xGizmo.dragBehavior) {
                this.positionGizmo.xGizmo.dragBehavior.dragDeltaRatio = 0.5; // Reduce sensitivity
            }
            if (this.positionGizmo.yGizmo && this.positionGizmo.yGizmo.dragBehavior) {
                this.positionGizmo.yGizmo.dragBehavior.dragDeltaRatio = 0.5;
            }
            if (this.positionGizmo.zGizmo && this.positionGizmo.zGizmo.dragBehavior) {
                this.positionGizmo.zGizmo.dragBehavior.dragDeltaRatio = 0.5;
            }
'''
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Added sensitivity control to position gizmo")

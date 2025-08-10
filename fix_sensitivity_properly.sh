#\!/bin/bash

# Remove the dragDeltaRatio lines that were added
sed -i '/dragDeltaRatio = 0.5/d' drawing-world.js

# Instead, modify the gizmo scale
sed -i 's/this.positionGizmo.scaleRatio = 1.0;/this.positionGizmo.scaleRatio = 0.7; \/\/ Reduce gizmo size and sensitivity/' drawing-world.js

echo Fixed move sensitivity with scale ratio

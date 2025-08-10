#\!/bin/bash

# Add debug logging to rotatePart
sed -i '/rotatePart(degrees, axis) {/a\
        console.log("🔧 rotatePart called:", degrees, axis);\
        console.log("selectedPart:", this.selectedPart);' drawing-world.js

# Also add logging before the return
sed -i 's/if (\!this.selectedPart) return;/if (\!this.selectedPart) {\
            console.error("❌ No selectedPart\!");\
            return;\
        }/' drawing-world.js

echo Added debug logging to rotatePart

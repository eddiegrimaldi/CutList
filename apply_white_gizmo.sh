#\!/bin/bash

# Apply white gizmo changes to drawing-world.js

# Update axis materials (around line 143)
sed -i '143s/material.diffuseColor = axis.color;/material.diffuseColor = new BABYLON.Color3(1, 1, 1); \/\/ Pure white/' drawing-world.js
sed -i '144s/material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);/material.specularColor = new BABYLON.Color3(0, 0, 0); \/\/ No specular/' drawing-world.js
sed -i '145s/material.emissiveColor = axis.color.scale(0.3);/material.emissiveColor = new BABYLON.Color3(1, 1, 1); \/\/ Self-illuminated white\n            material.disableLighting = true; \/\/ No shadows or lighting/' drawing-world.js

# Update plane materials (around line 216)
sed -i 's/material.diffuseColor = plane.color;/material.diffuseColor = new BABYLON.Color3(1, 1, 1); \/\/ Pure white/g' drawing-world.js
sed -i 's/material.emissiveColor = plane.color.scale(0.2);/material.emissiveColor = new BABYLON.Color3(1, 1, 1);\n            material.disableLighting = true;/g' drawing-world.js

# Update center sphere (around line 251)
sed -i 's/material.diffuseColor = this.colors.center;/material.diffuseColor = new BABYLON.Color3(1, 1, 1);/g' drawing-world.js
sed -i 's/material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);/material.specularColor = new BABYLON.Color3(0, 0, 0);/g' drawing-world.js
sed -i 's/material.emissiveColor = this.colors.center.scale(0.2);/material.emissiveColor = new BABYLON.Color3(1, 1, 1);\n        material.disableLighting = true;/g' drawing-world.js

echo White gizmo applied!

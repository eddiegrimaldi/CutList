#\!/bin/bash

# Just add modal to move tool
perl -i -pe 's/(mesh\.position\.copyFrom\(this\.ghostMesh\.position\);\s*\}\s*this\.hideTransformDisplay\(\);\s*this\.removeGhostMesh\(\);)/\n                        this.showTransformConfirmationModal(mesh, mesh.position, '\''position'\'');/g' drawing-world.js

echo Added modal to move tool only

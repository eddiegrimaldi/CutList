#\!/bin/bash

# Remove the line that resets mesh position during drag (let it move naturally)
sed -i 's/mesh.position = this.transformStartPosition.clone();/\/\/ REMOVED: Let mesh move naturally/' drawing-world.js

# Remove the line that moves ghost (let ghost stay at start)
sed -i 's/this.ghostMesh.position = currentPos.clone();/\/\/ REMOVED: Ghost stays at start position/' drawing-world.js

# Don't copy ghost position on drag end (mesh is already moved)
sed -i 's/mesh.position.copyFrom(this.ghostMesh.position);/\/\/ Mesh already moved during drag/' drawing-world.js

echo Fixed move tool to work like rotate

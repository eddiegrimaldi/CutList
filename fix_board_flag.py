#\!/usr/bin/env python3
import re

# Read the file
with open('drawing-world.js', 'r') as f:
    content = f.read()

# Find the addMaterialToProject function and add the isWorkBenchPart flag
pattern = r'(this\.boardFactory\.updateMeshTransform\(board\);)'
replacement = r'''this.boardFactory.updateMeshTransform(board);
            
            // CRITICAL FIX: Mark the mesh as a work bench part so it can be selected\!
            const mesh = this.scene.getMeshById(board.id);
            if (mesh) {
                mesh.isWorkBenchPart = true;
                mesh.isProjectPart = false;
                mesh.partData = part;  // Store reference to part data
                mesh.board = board;    // Store reference to board
                console.log("✅ Board mesh flagged as isWorkBenchPart:", mesh.name);
            } else {
                console.error("❌ Could not find mesh for board:", board.id);
            }'''

content = re.sub(pattern, replacement, content, count=1)

# Write back
with open('drawing-world.js', 'w') as f:
    f.write(content)

print("Fixed: Added isWorkBenchPart flag to BoardFactory-created boards")

#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Replace the CSG operation with proper separation
old_csg_section = '''            // Perform a single CSG operation - just subtract the blade
            console.log('Creating CSG from board...');
            const boardCSG = BABYLON.CSG.FromMesh(this.currentBoard);
            
            console.log('Creating CSG from blade...');
            const bladeCSG = BABYLON.CSG.FromMesh(blade);
            
            console.log('Performing CSG subtraction...');
            // Subtract the blade from the board - this creates the cut with kerf
            const resultCSG = boardCSG.subtract(bladeCSG);
            
            console.log('Converting result to mesh...');
            const resultMesh = resultCSG.toMesh('cutResult', this.currentBoard.material, this.millScene);
            
            // The result is now a single mesh with a gap where the blade cut through
            // We need to examine the result to see if it naturally separated into pieces
            // For now, we'll just display the result as-is
            
            resultMesh.position = this.currentBoard.position.clone();
            
            // Note: In real CSG, if the blade fully cuts through, we get one mesh with a gap
            // We would need to analyze the mesh to separate it into distinct pieces
            // For now, let's see what we get
            
            console.log('CSG result mesh created');
            
            // Store as a single piece for now to see the result
            const piece1 = resultMesh;
            const piece2 = null; // We'll handle separation differently'''

new_csg_section = '''            // Perform CSG cutting with proper piece separation
            console.log('Creating CSG from board...');
            const boardCSG = BABYLON.CSG.FromMesh(this.currentBoard);
            
            console.log('Creating CSG from blade...');
            const bladeCSG = BABYLON.CSG.FromMesh(blade);
            
            // First, subtract the blade to create the kerf
            console.log('Subtracting blade from board to create kerf...');
            const boardWithKerfCSG = boardCSG.subtract(bladeCSG);
            
            // Now create separation volumes to isolate each piece
            // Create a large box to separate left piece
            const separator1 = BABYLON.MeshBuilder.CreateBox('separator1', {
                width: 1000,
                height: 1000,
                depth: 1000
            }, this.millScene);
            
            // Position separator to the right of the blade
            separator1.position = blade.position.clone();
            separator1.position.z += 500 + kerfWidth/2;
            separator1.rotation = blade.rotation.clone();
            separator1.isVisible = false;
            
            // Create piece 1 (left side)
            console.log('Creating piece 1 (left side)...');
            const piece1CSG = boardWithKerfCSG.subtract(BABYLON.CSG.FromMesh(separator1));
            const piece1 = piece1CSG.toMesh('piece1', this.currentBoard.material.clone(), this.millScene);
            
            // Create separator for right piece
            const separator2 = BABYLON.MeshBuilder.CreateBox('separator2', {
                width: 1000,
                height: 1000,
                depth: 1000
            }, this.millScene);
            
            // Position separator to the left of the blade
            separator2.position = blade.position.clone();
            separator2.position.z -= 500 + kerfWidth/2;
            separator2.rotation = blade.rotation.clone();
            separator2.isVisible = false;
            
            // Create piece 2 (right side)
            console.log('Creating piece 2 (right side)...');
            const piece2CSG = boardWithKerfCSG.subtract(BABYLON.CSG.FromMesh(separator2));
            const piece2 = piece2CSG.toMesh('piece2', this.currentBoard.material.clone(), this.millScene);
            
            // Clean up separators
            separator1.dispose();
            separator2.dispose();
            
            console.log('CSG pieces created successfully');'''

content = content.replace(old_csg_section, new_csg_section)

# Fix the piece positioning code
old_positioning = '''            // For now, just position the result
            // We'll need to implement mesh separation logic later
            if (piece2) {
                const separation = 10;
                piece1.position = this.currentBoard.position.clone();
                piece1.position.z -= separation / 2;
                
                piece2.position = this.currentBoard.position.clone();
                piece2.position.z += separation / 2;
            }'''

new_positioning = '''            // Position pieces with visible gap
            const separation = 10;
            piece1.position = this.currentBoard.position.clone();
            piece1.position.z -= separation / 2;
            
            piece2.position = this.currentBoard.position.clone();
            piece2.position.z += separation / 2;'''

content = content.replace(old_positioning, new_positioning)

# Fix the piece storage
content = content.replace(
    '            this.cutPieces.push(piece1);\n            if (piece2) this.cutPieces.push(piece2);',
    '            this.cutPieces.push(piece1, piece2);'
)

# Fix the animation call
content = content.replace(
    '            if (piece2) this.showCutAnimation(piece1, piece2);',
    '            this.showCutAnimation(piece1, piece2);'
)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Implemented proper CSG piece separation")
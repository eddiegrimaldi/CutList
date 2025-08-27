#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Fix the bounds property access
old_bounds_access = '''            // Get board bounds first
            const bounds = this.currentBoard.getBoundingInfo().boundingBox;
            const kerfWidth = 3.175; // 1/8 inch kerf
            const bladeRadius = 127; // 10 inch blade
            
            // Create the cutting blade as a large rectangular box
            // This ensures it can cut through any size board
            const blade = BABYLON.MeshBuilder.CreateBox('blade', {
                width: 2000,  // Very wide to cut any board width
                height: 500,  // Tall enough to cut thick boards
                depth: kerfWidth  // Standard kerf width (3.175mm)
            }, this.millScene);
            
            // ALIGN BLADE WITH LASER LINE
            // The blade is a box that cuts along the laser line
            // Position at table center where laser crosses
            blade.position = new BABYLON.Vector3(0, 0, 0);
            
            // Apply turntable rotation (miter angle)
            // This rotates the blade around Y axis with the turntable
            if (this.bladeAngle) {
                blade.rotation.y = this.bladeAngle;
            }
            
            // Position blade at board height to ensure intersection
            const boardY = this.currentBoard.position.y;
            const boardThickness = bounds.max.y - bounds.min.y;
            blade.position.y = boardY; // Center of board height'''

new_bounds_access = '''            // Get board bounds first
            const bounds = this.currentBoard.getBoundingInfo().boundingBox;
            const kerfWidth = 3.175; // 1/8 inch kerf
            const bladeRadius = 127; // 10 inch blade
            
            // Create the cutting blade as a large rectangular box
            // This ensures it can cut through any size board
            const blade = BABYLON.MeshBuilder.CreateBox('blade', {
                width: 2000,  // Very wide to cut any board width
                height: 500,  // Tall enough to cut thick boards
                depth: kerfWidth  // Standard kerf width (3.175mm)
            }, this.millScene);
            
            // ALIGN BLADE WITH LASER LINE
            // The blade is a box that cuts along the laser line
            // Position at table center where laser crosses
            blade.position = new BABYLON.Vector3(0, 0, 0);
            
            // Apply turntable rotation (miter angle)
            // This rotates the blade around Y axis with the turntable
            if (this.bladeAngle) {
                blade.rotation.y = this.bladeAngle;
            }
            
            // Position blade at board height to ensure intersection
            const boardY = this.currentBoard.position.y;
            const boardThickness = bounds.maximum.y - bounds.minimum.y;
            blade.position.y = boardY; // Center of board height'''

content = content.replace(old_bounds_access, new_bounds_access)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed bounds property access (maximum/minimum instead of max/min)")
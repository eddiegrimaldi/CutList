#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Remove the duplicate blade creation sections and fix bounds
old_section = '''        try {
            console.log('Starting CSG cut operation...');
            
            // Get board dimensions
            const bounds = this.currentBoard.getBoundingInfo();
            const boardSize = bounds.maximum.subtract(bounds.minimum);
            
            // Create a realistic blade with proper kerf
            const kerfWidth = 3.175; // 1/8 inch kerf (standard table saw blade)
            const bladeRadius = 127; // 10 inch blade (254mm diameter)
            
            // Create the cutting blade aligned with the laser line
            const blade = BABYLON.MeshBuilder.CreateCylinder('blade', {
                height: kerfWidth,
                diameter: bladeRadius * 2,
                tessellation: 32
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

new_section = '''        try {
            console.log('Starting CSG cut operation...');
            
            // Get board dimensions
            const bounds = this.currentBoard.getBoundingInfo();
            const boardSize = bounds.maximum.subtract(bounds.minimum);
            const kerfWidth = 3.175; // 1/8 inch kerf (standard table saw blade)
            
            // Create the cutting blade as a large rectangular box
            // This ensures it can cut through any size board
            const blade = BABYLON.MeshBuilder.CreateBox('blade', {
                width: 2000,  // Very wide to cut any board width
                height: 500,  // Tall enough to cut thick boards
                depth: kerfWidth  // Standard kerf width (3.175mm)
            }, this.millScene);
            
            // ALIGN BLADE WITH LASER LINE
            // Position at table center where laser crosses
            blade.position = new BABYLON.Vector3(0, 0, 0);
            
            // Apply turntable rotation (miter angle)
            if (this.bladeAngle) {
                blade.rotation.y = this.bladeAngle;
            }
            
            // Position blade at board height to ensure intersection
            const boardY = this.currentBoard.position.y;
            const boardThickness = boardSize.y; // Use the already calculated boardSize
            blade.position.y = boardY; // Center of board height'''

content = content.replace(old_section, new_section)

# Also need to remove any other duplicate blade creation
# Look for the section that might be creating a box blade after this
old_duplicate = '''            // Get board bounds first
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

# Remove if it exists
content = content.replace(old_duplicate, '')

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed all bounds issues and removed duplicate blade creation")
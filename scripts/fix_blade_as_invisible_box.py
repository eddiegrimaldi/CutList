#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Make the visual blade invisible
old_blade_material = '''        const bladeMaterial = new BABYLON.StandardMaterial('bladeMat', this.millScene);
        bladeMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        bladeMaterial.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        bladeMaterial.alpha = 0.8;
        this.bladeVisual.material = bladeMaterial;'''

new_blade_material = '''        // Make blade invisible - users only need to see the laser line
        this.bladeVisual.isVisible = false;'''

content = content.replace(old_blade_material, new_blade_material)

# Change the CSG cutting blade from cylinder to a large box
old_csg_blade = '''            // Create the cutting blade as a cylinder (circular saw blade)
            const blade = BABYLON.MeshBuilder.CreateCylinder('blade', {
                height: kerfWidth,
                diameter: bladeRadius * 2,
                tessellation: 32
            }, this.millScene);'''

new_csg_blade = '''            // Create the cutting blade as a large rectangular box
            // This ensures it can cut through any size board
            const blade = BABYLON.MeshBuilder.CreateBox('blade', {
                width: 2000,  // Very wide to cut any board width
                height: 500,  // Tall enough to cut thick boards
                depth: kerfWidth  // Standard kerf width (3.175mm)
            }, this.millScene);'''

content = content.replace(old_csg_blade, new_csg_blade)

# Update blade positioning to work with box geometry
old_blade_positioning = '''            // ALIGN BLADE WITH LASER LINE
            // The blade must be positioned where the laser shows the cut
            // The laser is at Z=0, extending left-right across the table
            
            // Position blade at origin (where laser crosses center)
            blade.position = new BABYLON.Vector3(0, 0, 0);
            
            // The blade is a cylinder that needs to cut along the laser line
            // Default cylinder is vertical (Y axis), we need it horizontal
            blade.rotation.x = Math.PI / 2; // Rotate to horizontal
            
            // Apply turntable rotation (miter angle)
            // This rotates the blade around Y axis with the turntable
            if (this.bladeAngle) {
                blade.rotation.y = this.bladeAngle;
            }'''

new_blade_positioning = '''            // ALIGN BLADE WITH LASER LINE
            // The blade is a box that cuts along the laser line
            // Position at table center where laser crosses
            blade.position = new BABYLON.Vector3(0, 0, 0);
            
            // Apply turntable rotation (miter angle)
            // This rotates the blade around Y axis with the turntable
            if (this.bladeAngle) {
                blade.rotation.y = this.bladeAngle;
            }'''

content = content.replace(old_blade_positioning, new_blade_positioning)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed blade to be invisible box for cutting")
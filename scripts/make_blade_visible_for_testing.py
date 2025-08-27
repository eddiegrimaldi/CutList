#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Make the visual blade visible with semi-transparent material for testing
old_blade_invisible = '''        // Make blade invisible - users only need to see the laser line
        this.bladeVisual.isVisible = false;'''

new_blade_visible = '''        // Make blade visible for testing with semi-transparent material
        const bladeMaterial = new BABYLON.StandardMaterial('bladeMat', this.millScene);
        bladeMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.8); // Blue for visibility
        bladeMaterial.alpha = 0.3; // Semi-transparent
        this.bladeVisual.material = bladeMaterial;
        this.bladeVisual.isVisible = true; // Visible for testing'''

content = content.replace(old_blade_invisible, new_blade_visible)

# Also make the CSG cutting blade visible for debugging
old_csg_invisible = '''            // Blade is invisible for CSG operation
            blade.isVisible = false;
            
            console.log('Blade aligned at Z=0 for cutting');
            console.log('Board position:', this.currentBoard.position);'''

new_csg_visible = '''            // Make blade visible for debugging
            blade.material = new BABYLON.StandardMaterial('csgBladeMat', this.millScene);
            blade.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red for CSG blade
            blade.material.alpha = 0.4; // Semi-transparent
            blade.isVisible = true; // Visible for debugging
            
            console.log('CSG Blade (red box) positioned at:', blade.position);
            console.log('Board position:', this.currentBoard.position);'''

content = content.replace(old_csg_invisible, new_csg_visible)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Made blade visible for testing (blue disc visual, red box for CSG)")
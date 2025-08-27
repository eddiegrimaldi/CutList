#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Remove the debug visibility lines
old_debug = '''            // Make blade visible for debugging
            blade.material = new BABYLON.StandardMaterial('bladeMat', this.millScene);
            blade.material.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue for visibility
            blade.material.alpha = 0.5;
            
            console.log('Blade positioned at:', blade.position);
            console.log('Blade rotation:', blade.rotation);
            console.log('Board at:', this.currentBoard.position);
            
            blade.material.alpha = 0.5;
            blade.isVisible = true; // Let's see where it actually is
            
            console.log('Blade position:', blade.position);
            console.log('Board position:', this.currentBoard.position);
            console.log('Board bounds:', bounds);
            
            blade.isVisible = false;'''

new_debug = '''            // Blade is invisible for CSG operation
            blade.isVisible = false;
            
            console.log('Blade aligned at Z=0 for cutting');
            console.log('Board position:', this.currentBoard.position);'''

content = content.replace(old_debug, new_debug)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Removed blade debug visibility")
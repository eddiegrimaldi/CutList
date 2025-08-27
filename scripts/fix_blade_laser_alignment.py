#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Fix the blade alignment with laser
old_blade_section = '''            // ALIGN BLADE WITH LASER LINE
            // The laser line shows where the cut will happen
            // The blade must be positioned and oriented exactly like the laser
            
            // Copy position from laser (if it exists)
            if (this.laserLine) {
                blade.position = this.laserLine.position.clone();
                blade.rotation = this.laserLine.rotation.clone();
                console.log('Blade aligned with laser line');
            } else {
                // Default position at table height, Z=0
                blade.position = new BABYLON.Vector3(0, 0, 0);
                
                // The blade cuts perpendicular to its disc face
                // For a vertical blade cutting forward/backward:
                blade.rotation.x = Math.PI / 2; // Make cylinder horizontal
                
                // Apply turntable rotation (miter angle)
                blade.rotation.y = this.bladeAngle || 0;
            }
            
            // Adjust blade height to intersect with board
            const boardY = this.currentBoard.position.y;
            blade.position.y = boardY; // Move blade up to board height
            
            // Apply bevel angle (tilt) - this is in addition to laser alignment
            if (Math.abs(this.bevelAngle - 90) > 0.1) {
                const bevelRadians = (90 - this.bevelAngle) * Math.PI / 180;
                // Apply bevel as additional rotation
                const currentRotation = blade.rotation.clone();
                blade.rotation.z = currentRotation.z + (bevelRadians * this.bevelDirection);
            }'''

new_blade_section = '''            // ALIGN BLADE WITH LASER LINE
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
            }
            
            // Position blade at board height to ensure intersection
            const boardY = this.currentBoard.position.y;
            const boardThickness = bounds.max.y - bounds.min.y;
            blade.position.y = boardY; // Center of board height
            
            // Apply bevel angle (blade tilt)
            if (Math.abs(this.bevelAngle - 90) > 0.1) {
                const bevelRadians = (90 - this.bevelAngle) * Math.PI / 180;
                // Bevel rotates around the cutting axis (Z when blade is at 0 miter)
                blade.rotation.z = bevelRadians * this.bevelDirection;
            }
            
            // Make blade visible for debugging
            blade.material = new BABYLON.StandardMaterial('bladeMat', this.millScene);
            blade.material.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue for visibility
            blade.material.alpha = 0.5;
            
            console.log('Blade positioned at:', blade.position);
            console.log('Blade rotation:', blade.rotation);
            console.log('Board at:', this.currentBoard.position);'''

content = content.replace(old_blade_section, new_blade_section)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed blade alignment with laser line")
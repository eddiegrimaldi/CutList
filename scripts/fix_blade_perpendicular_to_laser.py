#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Fix the visual blade orientation - it should be vertical, perpendicular to table
old_blade_creation = '''        // Create a more realistic blade visual (10 inch diameter)
        this.bladeVisual = BABYLON.MeshBuilder.CreateDisc('blade', {
            radius: 127, // 10 inch blade
            tessellation: 64,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.millScene);
        
        // Orient the visual blade to match cutting direction (along Z)
        this.bladeVisual.rotation.y = Math.PI / 2; // Face the blade along Z axis'''

new_blade_creation = '''        // Create a more realistic blade visual (10 inch diameter)
        this.bladeVisual = BABYLON.MeshBuilder.CreateDisc('blade', {
            radius: 127, // 10 inch blade
            tessellation: 64,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.millScene);
        
        // CRITICAL: Orient blade to be vertical and perpendicular to laser
        // The disc is created facing Z by default
        // We need it vertical (standing up) and cutting along the laser line
        this.bladeVisual.rotation.x = Math.PI / 2; // Stand the blade up vertically
        this.bladeVisual.rotation.z = Math.PI / 2; // Align with laser line direction'''

content = content.replace(old_blade_creation, new_blade_creation)

# Also fix the blade tilt update to maintain proper orientation
old_tilt_update = '''        // Calculate radians
        const tiltRadians = (90 - Math.abs(angle)) * Math.PI / 180;
        
        // Apply rotation to visual blade
        // First apply miter angle (turntable rotation)
        this.bladeVisual.rotation.y = Math.PI / 2 + (this.bladeAngle || 0);
        
        // Then apply bevel tilt around X axis (blade leans left/right)
        this.bladeVisual.rotation.x = -tiltRadians * direction;'''

new_tilt_update = '''        // Calculate radians
        const tiltRadians = (90 - Math.abs(angle)) * Math.PI / 180;
        
        // Apply rotations to visual blade
        // Start with vertical orientation
        this.bladeVisual.rotation.x = Math.PI / 2; // Vertical
        this.bladeVisual.rotation.z = Math.PI / 2; // Aligned with laser
        
        // Apply miter angle (turntable rotation around Y)
        this.bladeVisual.rotation.y = this.bladeAngle || 0;
        
        // Apply bevel tilt (lean the blade left/right)
        // This is a compound rotation when blade is vertical
        const bevelRotation = -tiltRadians * direction;
        this.bladeVisual.rotation.z += bevelRotation;'''

content = content.replace(old_tilt_update, new_tilt_update)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed blade to be perpendicular to laser line")
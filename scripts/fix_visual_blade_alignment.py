#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Fix visual blade positioning
old_visual_pos = '''        // Position blade to align with laser line
        this.bladeVisual.position.y = 0;
        this.bladeVisual.position.z = 0;
        
        // The visual blade should match the laser orientation'''

new_visual_pos = '''        // Position blade at cutting height above table
        this.bladeVisual.position.y = 50; // Above table at typical cutting height
        this.bladeVisual.position.z = 0; // Aligned with laser at Z=0
        this.bladeVisual.position.x = 0; // Centered'''

content = content.replace(old_visual_pos, new_visual_pos)

# Also update the blade tilt to include miter angle
old_tilt = '''        // Calculate radians
        const tiltRadians = (90 - Math.abs(angle)) * Math.PI / 180;
        
        // Apply rotation to visual blade
        // Tilt around X axis for visual effect (blade leans left/right)
        this.bladeVisual.rotation.x = -tiltRadians * direction;'''

new_tilt = '''        // Calculate radians
        const tiltRadians = (90 - Math.abs(angle)) * Math.PI / 180;
        
        // Apply rotation to visual blade
        // First apply miter angle (turntable rotation)
        this.bladeVisual.rotation.y = Math.PI / 2 + (this.bladeAngle || 0);
        
        // Then apply bevel tilt around X axis (blade leans left/right)
        this.bladeVisual.rotation.x = -tiltRadians * direction;'''

content = content.replace(old_tilt, new_tilt)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed visual blade alignment")
#!/usr/bin/env python3
"""
Direct fixes for the three bevel issues
"""

import subprocess

SSH = "ssh -i /home/edgrimaldi/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"
FILE = "/var/www/html/modules/TheMillSystem.js"

print("Reading current file...")
read_cmd = f'{SSH} "cat {FILE}"'
result = subprocess.run(read_cmd, shell=True, capture_output=True, text=True)
content = result.stdout

lines = content.split('\n')

# Fix 1: B view zoom - line 1339
print("Fixing B view zoom...")
for i in range(len(lines)):
    if i == 1338:  # Line 1339 (0-indexed)
        lines[i] = '        const orthoSize = 25; // VERY close zoom for side view'
        
# Fix 2: Bevel needle movement - fix angle calculation around line 1225-1236
print("Fixing bevel needle movement...")
for i in range(len(lines)):
    if 'Calculate angle (0 to 180 degrees for hemisphere)' in lines[i]:
        # Replace the angle calculation logic
        lines[i] = '            // Calculate angle for full hemisphere (-90 to +90 degrees)'
        lines[i+1] = '            let angle = Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI;'
        lines[i+2] = '            '
        lines[i+3] = '            // Map to left (-90 to 0) or right (0 to +90)'
        lines[i+4] = '            if (dx < 0) angle = -angle; // Left side is negative'
        lines[i+5] = '            '
        lines[i+6] = '            // Store direction and absolute angle'
        lines[i+7] = '            this.bevelDirection = angle < 0 ? -1 : 1;'
        lines[i+8] = '            this.bevelAngle = Math.abs(angle);'
        lines[i+9] = '            '
        lines[i+10] = '            // Update needle rotation'
        lines[i+11] = '            const needleRotation = angle; // Direct angle for needle'
        break

# Fix 3: Blade tilt direction - around line 1303
print("Fixing blade tilt direction...")
for i in range(len(lines)):
    if i == 1302:  # Line 1303 (0-indexed)
        lines[i] = '        this.bladeVisual.rotation.x = tiltRadians * direction; // Match needle direction'

# Fix 4: Display angle with sign
print("Fixing angle display...")
for i in range(len(lines)):
    if "display.textContent = this.bevelAngle.toFixed(1) + ''" in lines[i]:
        lines[i] = "            display.textContent = (this.bevelDirection < 0 ? '-' : '') + this.bevelAngle.toFixed(1) + '°';"

# Write the fixed content
print("Writing fixed content...")
fixed_content = '\n'.join(lines)

# Use a temporary file approach
write_cmd = f'{SSH} "cat > /tmp/mill_fixed.js << \'EOFMARKER\'\n{fixed_content}\nEOFMARKER"'
subprocess.run(write_cmd, shell=True)

# Move to final location
move_cmd = f'{SSH} "cp {FILE} {FILE}.backup_$(date +%s) && mv /tmp/mill_fixed.js {FILE}"'
subprocess.run(move_cmd, shell=True)

print("Done! Refresh browser to test.")
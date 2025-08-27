#!/usr/bin/env python3
"""
Fix three issues in TheMillSystem.js:
1. Zoom in B view - make board fill screen
2. Bevel needle movement - allow both left and right (-90 to +90)
3. Blade tilt direction - match needle direction
"""

import subprocess

# SSH command prefix
SSH_PREFIX = "ssh -i /home/edgrimaldi/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"
FILE_PATH = "/var/www/html/modules/TheMillSystem.js"

# First, create a backup
print("Creating backup...")
backup_cmd = f'{SSH_PREFIX} "cp {FILE_PATH} {FILE_PATH}.backup_bevel_$(date +%s)"'
subprocess.run(backup_cmd, shell=True)

# Fix 1: Zoom in B view - change padding from 1.2 to 1.05 for very close zoom
print("\n1. Fixing zoom in B view...")
fix1_cmd = f'''{SSH_PREFIX} "sed -i 's/const paddedSize = maxSize \\* 1.2;/const paddedSize = maxSize * 1.05;/' {FILE_PATH}"'''
subprocess.run(fix1_cmd, shell=True)

# Also fix the specific B view zoom to be MUCH closer
fix1b_cmd = f'''{SSH_PREFIX} "sed -i '1339s/.*/        const orthoSize = 30; \\/\\/ MUCH closer zoom for 6\\" board to fill screen/' {FILE_PATH}"'''
subprocess.run(fix1b_cmd, shell=True)

# Fix 2: Bevel needle movement - allow full -90 to +90 degrees
print("\n2. Fixing bevel needle to allow left and right movement...")

# Replace the angle calculation section (lines 1225-1236)
fix2_cmd = f'''{SSH_PREFIX} "cat > /tmp/bevel_fix.txt << 'EOF'
            // Calculate angle for full hemisphere (-90 to +90 degrees)
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Map to -90 to +90 range (left negative, right positive)
            // Straight up is 0, left is negative, right is positive
            if (angle > 90) angle = angle - 180;
            
            // Store the bevel angle (0 to 90) and direction
            this.bevelDirection = angle < 0 ? -1 : 1;
            this.bevelAngle = Math.abs(angle);
            
            // Update needle rotation (-90 to +90 from vertical)
            const needleRotation = angle; // Direct angle for needle
EOF
"'''
subprocess.run(fix2_cmd, shell=True)

# Apply the fix using Python instead of sed for complex replacement
fix2_apply = f'''{SSH_PREFIX} "python3 -c \\"
import re

with open('{FILE_PATH}', 'r') as f:
    content = f.read()

# Find and replace the angle calculation section
old_pattern = r'            // Calculate angle.*?const needleRotation = \\\\(90 - this.bevelAngle\\\\);.*?// Rotate from vertical'
new_text = open('/tmp/bevel_fix.txt', 'r').read().strip()

# Use a simpler approach - replace specific lines
lines = content.split('\\\\n')
for i in range(len(lines)):
    if 'Calculate angle (0 to 180 degrees for hemisphere)' in lines[i]:
        # Replace the next 10 lines with our new logic
        indent = '            '
        new_lines = [
            indent + '// Calculate angle for full hemisphere (-90 to +90 degrees)',
            indent + 'let angle = Math.atan2(dy, dx) * 180 / Math.PI;',
            indent + '',
            indent + '// Map to -90 to +90 range (left negative, right positive)',
            indent + '// Straight up is 0, left is negative, right is positive',
            indent + 'if (angle > 90) angle = angle - 180;',
            indent + '',
            indent + '// Store the bevel angle (0 to 90) and direction',
            indent + 'this.bevelDirection = angle < 0 ? -1 : 1;',
            indent + 'this.bevelAngle = Math.abs(angle);',
            indent + '',
            indent + '// Update needle rotation (-90 to +90 from vertical)',
            indent + 'const needleRotation = angle; // Direct angle for needle'
        ]
        lines[i:i+10] = new_lines
        break

with open('{FILE_PATH}', 'w') as f:
    f.write('\\\\n'.join(lines))
\\""'''
subprocess.run(fix2_apply, shell=True)

# Fix 3: Blade tilt direction - make it match needle
print("\n3. Fixing blade tilt direction...")
fix3_cmd = f'''{SSH_PREFIX} "sed -i '1303s/.*/        this.bladeVisual.rotation.x = tiltRadians * direction; \\/\\/ Match needle direction/' {FILE_PATH}"'''
subprocess.run(fix3_cmd, shell=True)

# Also fix the initial needle position to be vertical (90 degrees)
print("\n4. Fixing initial needle position...")
fix4_cmd = f'''{SSH_PREFIX} "sed -i 's/needle.style.transform = .translateX(-50%) rotate(0deg)./needle.style.transform = \\"translateX(-50%) rotate(0deg)\\"; \\/\\/ Start vertical/' {FILE_PATH}"'''
subprocess.run(fix4_cmd, shell=True)

# Fix the display to show signed angles
print("\n5. Fixing display to show proper angle...")
fix5_cmd = f'''{SSH_PREFIX} "sed -i \\"s/display.textContent = this.bevelAngle.toFixed(1) + '';/display.textContent = (this.bevelDirection < 0 ? '-' : '') + this.bevelAngle.toFixed(1) + '°';/\\" {FILE_PATH}"'''
subprocess.run(fix5_cmd, shell=True)

print("\nFixes applied! Testing...")

# Test that the file is valid
test_cmd = f'{SSH_PREFIX} "node -c {FILE_PATH} 2>&1"'
result = subprocess.run(test_cmd, shell=True, capture_output=True, text=True)
if result.returncode == 0:
    print("✓ File syntax is valid!")
else:
    print("✗ Syntax error found:")
    print(result.stderr)

print("\nPlease refresh the browser to test the changes.")
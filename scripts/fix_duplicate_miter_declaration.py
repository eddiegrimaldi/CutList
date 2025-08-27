#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Remove the duplicate miterAngleDegrees declaration
# Keep only the one at the function start
old_section = '''    executeCSGCut() {
        console.log('Executing CSG cut...');
        
        // Check for pieces and current board
        if (this.cutPieces && this.cutPieces.length > 0 && !this.currentBoard) {
            alert('Please select a piece to cut by clicking on it.');
            return;
        }
        
        if (!this.currentBoard) {
            alert('No material to cut');
            return;
        }
        
        // Define miterAngleDegrees here so it's available throughout the function
        const miterAngleDegrees = (this.bladeAngle * 180 / Math.PI) % 360;
        
        try {'''

new_section = '''    executeCSGCut() {
        console.log('Executing CSG cut...');
        
        // Calculate miter angle for the entire function
        const miterAngleDegrees = (this.bladeAngle * 180 / Math.PI) % 360;
        console.log('CSG Cut - Miter:', miterAngleDegrees, 'Bevel:', this.bevelAngle);
        
        // Check for pieces and current board
        if (this.cutPieces && this.cutPieces.length > 0 && !this.currentBoard) {
            alert('Please select a piece to cut by clicking on it.');
            return;
        }
        
        if (!this.currentBoard) {
            alert('No material to cut');
            return;
        }
        
        try {'''

content = content.replace(old_section, new_section)

# Also check if there's another duplicate at line 1167-1169
content = content.replace(
    '''    executeCSGCut() {
        const miterAngleDegrees = (this.bladeAngle * 180 / Math.PI) % 360;
        console.log('CSG Cut - Miter:', miterAngleDegrees, 'Bevel:', this.bevelAngle);''',
    '''    executeCSGCut() {
        console.log('Executing CSG cut...');
        const miterAngleDegrees = (this.bladeAngle * 180 / Math.PI) % 360;
        console.log('CSG Cut - Miter:', miterAngleDegrees, 'Bevel:', this.bevelAngle);'''
)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed duplicate miterAngleDegrees declarations")
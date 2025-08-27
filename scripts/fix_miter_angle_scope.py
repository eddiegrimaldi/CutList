#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Move miterAngleDegrees declaration to the beginning of the function
old_function_start = '''    executeCSGCut() {
        console.log('Executing CSG cut...');
        const miterAngleDegrees = (this.bladeAngle * 180 / Math.PI) % 360;
        console.log('CSG Cut - Miter:', miterAngleDegrees, 'Bevel:', this.bevelAngle);'''

new_function_start = '''    executeCSGCut() {
        console.log('Executing CSG cut...');
        const miterAngleDegrees = (this.bladeAngle * 180 / Math.PI) % 360;
        console.log('CSG Cut - Miter:', miterAngleDegrees, 'Bevel:', this.bevelAngle);'''

# The function is already correct, but we need to make sure miterAngleDegrees is accessible in the try block
# Let's move it to be declared before the try block
old_try_section = '''        
        // Check for pieces and current board
        if (this.cutPieces && this.cutPieces.length > 0 && !this.currentBoard) {
            alert('Please select a piece to cut by clicking on it.');
            return;
        }
        
        if (!this.currentBoard) {
            alert('No material to cut');
            return;
        }
        
        try {
            console.log('Starting CSG cut operation...');'''

new_try_section = '''        
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
        
        try {
            console.log('Starting CSG cut operation...');'''

content = content.replace(old_try_section, new_try_section)

# Remove the duplicate declaration at the top
content = content.replace(
    '''    executeCSGCut() {
        console.log('Executing CSG cut...');
        const miterAngleDegrees = (this.bladeAngle * 180 / Math.PI) % 360;
        console.log('CSG Cut - Miter:', miterAngleDegrees, 'Bevel:', this.bevelAngle);''',
    '''    executeCSGCut() {
        console.log('Executing CSG cut...');'''
)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Fixed miterAngleDegrees scope issue")
// Node.js script to test blade camera positioning
const fs = require('fs');

// Read TheMillSystem.js
const content = fs.readFileSync('/var/www/html/modules/TheMillSystem.js', 'utf8');

// Extract updateBladeEyeCamera method
const match = content.match(/updateBladeEyeCamera\(\)\s*\{[\s\S]*?\n    \}/);
if (match) {
    console.log('Found updateBladeEyeCamera method:');
    console.log(match[0]);
    
    // Check what it's actually doing
    if (match[0].includes('bladeZ.scale')) {
        console.log('\nSTATUS: Camera is positioned along blade Z-axis (perpendicular to width)');
        console.log('This SHOULD show the thin edge');
    } else if (match[0].includes('bladeLocalX')) {
        console.log('\nSTATUS: Camera is positioned along blade X-axis (along width)');
        console.log('This will show the WIDE side - WRONG!');
    } else {
        console.log('\nSTATUS: Unknown camera positioning');
    }
} else {
    console.log('ERROR: Could not find updateBladeEyeCamera method');
}

// Test the logic
console.log('\n=== TESTING CAMERA LOGIC ===');
const miterAngle = Math.PI / 4; // 45 degrees
const bladeX = { x: Math.cos(miterAngle), z: Math.sin(miterAngle) };
const bladeZ = { x: -Math.sin(miterAngle), z: Math.cos(miterAngle) };

console.log('Blade rotated 45 degrees:');
console.log('- Blade X-axis (width direction):', bladeX);
console.log('- Blade Z-axis (perpendicular):', bladeZ);
console.log('\nFor shark fin view:');
console.log('- Camera should be along Z-axis');
console.log('- This looks ACROSS the 500-unit width');
console.log('- Sees only the 0.3175 kerf thickness');

#!/usr/bin/env python3
"""
Fix cut piece positioning - pieces should stay in place with only kerf gap separation
"""
import shutil

# Read the file
with open('/var/www/html/modules/CutToolSystem.js', 'r') as f:
    content = f.read()

# Backup original to home directory
shutil.copy('/var/www/html/modules/CutToolSystem.js', '/home/edgrimaldi/CutToolSystem.js.backup_positioning')

# Fix piece 1 positioning - stay in place with kerf offset
old_piece1_positioning = '''        // Position piece 1 
        const originalAxisValue = cutAxis === 'x' ? originalPosition.x : (cutAxis === 'y' ? originalPosition.y : originalPosition.z);
        const totalSize = cutDimension * 2.54; // Convert total dimension from inches to cm
        const originalStart = originalAxisValue - (totalSize / 2);
        const piece1SizeCm = piece1SizeInches * 2.54;
        const piece1Center = originalStart + (piece1SizeCm / 2);
        
        if (cutAxis === 'x') {
            mesh1.position.x = piece1Center;
        } else if (cutAxis === 'y') {
            mesh1.position.y = piece1Center;
        } else {
            mesh1.position.z = piece1Center;
        }'''

new_piece1_positioning = '''        // Position piece 1 - SIMPLIFIED: Stay in place, just offset by kerf
        const kerfOffsetCm = kerfWidth / 2; // Half kerf width offset
        
        if (cutAxis === 'x') {
            mesh1.position.x = originalPosition.x - kerfOffsetCm;
        } else if (cutAxis === 'y') {
            mesh1.position.y = originalPosition.y - kerfOffsetCm;
        } else {
            mesh1.position.z = originalPosition.z - kerfOffsetCm;
        }'''

# Fix piece 2 positioning - stay in place with kerf offset on other side  
old_piece2_positioning = '''        // Position piece 2
        const piece2SizeCm = piece2SizeInches * 2.54;
        const piece2Start = originalStart + piece1SizeCm + kerfWidth;
        const piece2Center = piece2Start + (piece2SizeCm / 2);
        
        if (cutAxis === 'x') {
            mesh2.position.x = piece2Center;
        } else if (cutAxis === 'y') {
            mesh2.position.y = piece2Center;
        } else {
            mesh2.position.z = piece2Center;
        }'''

new_piece2_positioning = '''        // Position piece 2 - SIMPLIFIED: Stay in place, just offset by kerf on other side
        if (cutAxis === 'x') {
            mesh2.position.x = originalPosition.x + kerfOffsetCm;
        } else if (cutAxis === 'y') {
            mesh2.position.y = originalPosition.y + kerfOffsetCm;
        } else {
            mesh2.position.z = originalPosition.z + kerfOffsetCm;
        }'''

# Apply fixes
content = content.replace(old_piece1_positioning, new_piece1_positioning)
content = content.replace(old_piece2_positioning, new_piece2_positioning)

# Write to temp file
with open('/home/edgrimaldi/CutToolSystem_fixed.js', 'w') as f:
    f.write(content)

print("✅ Fixed cut piece positioning - pieces now stay in place with only kerf gap separation")
print("📁 Fixed file saved to /home/edgrimaldi/CutToolSystem_fixed.js")
print("🔧 Run: cp /home/edgrimaldi/CutToolSystem_fixed.js /var/www/html/modules/CutToolSystem.js")
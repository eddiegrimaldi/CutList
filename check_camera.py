#!/usr/bin/env python3
import re

# Read the current TheMillSystem.js
with open('/var/www/html/modules/TheMillSystem.js', 'r') as f:
    content = f.read()

# Find the updateBladeEyeCamera method
pattern = r'updateBladeEyeCamera\(\) \{.*?\n    \}'
match = re.search(pattern, content, re.DOTALL)

if match:
    method = match.group(0)
    print("Current updateBladeEyeCamera method:")
    print("=" * 50)
    
    # Check key indicators
    if 'bladeZ.scale' in method or 'bladeZ' in method:
        print("✓ Camera uses blade Z-axis (perpendicular to width)")
        print("  This SHOULD show thin edge")
    elif 'bladeLocalX' in method or 'blade_x_world' in method:
        print("✗ Camera uses blade X-axis (along width)")
        print("  This shows WIDE side - WRONG!")
    else:
        print("? Unknown camera positioning")
    
    # Check if the method is actually being called
    print("\nMethod calls in file:")
    calls = re.findall(r'this\.updateBladeEyeCamera\(\)', content)
    print(f"Found {len(calls)} calls to updateBladeEyeCamera")
    
    # Check if split screen is enabled
    if 'enableSplitScreen' in content:
        print("✓ enableSplitScreen method exists")
    if 'splitScreenEnabled' in content:
        print("✓ splitScreenEnabled flag exists")
        
else:
    print("ERROR: Could not find updateBladeEyeCamera method!")

print("\n" + "=" * 50)
print("If camera isn't moving, the method might not be executing")
print("or the changes aren't taking effect in the scene.")

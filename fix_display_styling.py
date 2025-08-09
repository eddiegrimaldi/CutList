#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Update createTransformDisplay function (around line 11972)
for i in range(len(lines)):
    # Update the display styling in createTransformDisplay
    if 'display.style.background = "rgba(0, 0, 0, 0.8)";' in lines[i]:
        lines[i] = '        // No background - just plain text\n'
    elif 'display.style.color = "white";' in lines[i]:
        lines[i] = '        display.style.color = "black";\n'
    elif 'display.style.padding = "4px 8px";' in lines[i]:
        lines[i] = '        // No padding needed\n'
    elif 'display.style.borderRadius = "5px";' in lines[i]:
        lines[i] = '        // No border radius needed\n'
    elif 'display.style.fontSize = "18px";' in lines[i]:
        lines[i] = '        display.style.fontSize = "24px";\n'
    elif 'display.style.pointerEvents = "none";' in lines[i]:
        # Add centering after pointerEvents
        lines[i] = '        display.style.pointerEvents = "none";\n        display.style.top = "50%";\n        display.style.left = "50%";\n        display.style.transform = "translate(-50%, -50%)";\n'
    
    # Update the display text in updateTransformDisplay - remove axis letter
    elif 'displayText = axis.toUpperCase() + \': \' + val.toFixed(2) + \'"\';' in lines[i]:
        lines[i] = '            displayText = val.toFixed(2) + \'"\';\n'
    elif 'displayText = axis.toUpperCase() + \': \' + val.toFixed(1) + \'°\';' in lines[i]:
        lines[i] = '            displayText = val.toFixed(1) + \'°\';\n'
    
    # Remove the positioning code that moves it near mesh
    elif '// Position near the mesh' in lines[i]:
        # Comment out the entire positioning block
        j = i
        while j < len(lines) and 'this.transformDisplay.style.display = \'block\';' not in lines[j]:
            if not lines[j].strip().startswith('//'):
                lines[j] = '        // ' + lines[j].lstrip()
            j += 1

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Updated display styling and positioning')

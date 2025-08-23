with open('TheMillSystem.js', 'r') as f:
    lines = f.readlines()

# Fix blade-eye camera position for 500 inch blade
for i in range(len(lines)):
    if 'const bladeLength = 100;' in lines[i]:
        # Update to be OUTSIDE the 500 inch blade
        lines[i] = '        const bladeLength = 260;  // Outside the 500 inch blade (250 + margin)\n'
        break

with open('TheMillSystem.js', 'w') as f:
    f.writelines(lines)

print('Fixed blade-eye camera to be outside 500 inch blade')

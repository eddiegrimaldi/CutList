with open('TheMillSystem.js', 'r') as f:
    lines = f.readlines()

# Fix blade positioning to be truly centered
for i in range(245, 255):
    if i < len(lines):
        if 'this.blade.position.x = 0' in lines[i]:
            # Already at 0, good
            pass
        elif 'this.blade.position.z = 0' in lines[i]:
            # Add Y position after Z
            lines.insert(i + 1, '        this.blade.position.y = 0;  // Blade center at table height\n')
            break

# Update the console log
for i in range(245, 260):
    if i < len(lines):
        if 'Blade created with pivot at left edge' in lines[i]:
            lines[i] = '        console.log(\'Blade created: 500" wide, centered on table\');\n'
            break

with open('TheMillSystem.js', 'w') as f:
    f.writelines(lines)

print('Fixed blade centering')

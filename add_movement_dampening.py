#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Add movement dampening in the drag observers
for i in range(10855, 10875):
    if 'const currentPos = mesh.position.clone();' in lines[i]:
        lines[i] = '''                        // Dampen movement significantly
                        const rawPos = mesh.position.clone();
                        const dampFactor = 0.1; // Only apply 10% of movement
                        const currentPos = this.transformStartPosition.add(
                            rawPos.subtract(this.transformStartPosition).scale(dampFactor)
                        );
                        mesh.position.copyFrom(currentPos); // Apply dampened position back
'''
        break

# Do same for Y axis
for i in range(10890, 10910):
    if 'const currentPos = mesh.position.clone();' in lines[i]:
        lines[i] = '''                        // Dampen movement significantly
                        const rawPos = mesh.position.clone();
                        const dampFactor = 0.1;
                        const currentPos = this.transformStartPosition.add(
                            rawPos.subtract(this.transformStartPosition).scale(dampFactor)
                        );
                        mesh.position.copyFrom(currentPos);
'''
        break

# Do same for Z axis
for i in range(10925, 10945):
    if 'const currentPos = mesh.position.clone();' in lines[i]:
        lines[i] = '''                        // Dampen movement significantly
                        const rawPos = mesh.position.clone();
                        const dampFactor = 0.1;
                        const currentPos = this.transformStartPosition.add(
                            rawPos.subtract(this.transformStartPosition).scale(dampFactor)
                        );
                        mesh.position.copyFrom(currentPos);
'''
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Added movement dampening")

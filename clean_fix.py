#\!/usr/bin/env python3
import re

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Fix 1: Add modal to move tool (all three axes)
fixes = 0

# Find move tool X axis drag end
pattern = r'(this\.positionGizmo\.xGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{[^}]*?if \(this\.ghostMesh\) \{[^}]*?mesh\.position\.copyFrom\(this\.ghostMesh\.position\);[^}]*?\}[^}]*?this\.hideTransformDisplay\(\);[^}]*?this\.removeGhostMesh\(\);)'

replacement = r'''\1
                        this.showTransformConfirmationModal(mesh, mesh.position, 'position');'''

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    fixes += 1

# Y axis
pattern = r'(this\.positionGizmo\.yGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{[^}]*?if \(this\.ghostMesh\) \{[^}]*?mesh\.position\.copyFrom\(this\.ghostMesh\.position\);[^}]*?\}[^}]*?this\.hideTransformDisplay\(\);[^}]*?this\.removeGhostMesh\(\);)'

replacement = r'''\1
                        this.showTransformConfirmationModal(mesh, mesh.position, 'position');'''

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    fixes += 1

# Z axis
pattern = r'(this\.positionGizmo\.zGizmo\.dragBehavior\.onDragEndObservable\.add\(\(\) => \{[^}]*?if \(this\.ghostMesh\) \{[^}]*?mesh\.position\.copyFrom\(this\.ghostMesh\.position\);[^}]*?\}[^}]*?this\.hideTransformDisplay\(\);[^}]*?this\.removeGhostMesh\(\);)'

replacement = r'''\1
                        this.showTransformConfirmationModal(mesh, mesh.position, 'position');'''

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    fixes += 1

print(f"Added {fixes} move tool modals")

# Fix 2: Remove duplicate rotation position locking
pattern = r'// Override position updates during rotation[^}]*?if \(rotationStartPosition && this\.rotationGizmo\._rootMesh\) \{[^}]*?this\.rotationGizmo\._rootMesh\.position\.copyFrom\(rotationStartPosition\);[^}]*?\}[^}]*?\}\);[^}]*?\}'

if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, '// REMOVED: Duplicate rotation handlers', content, flags=re.DOTALL)
    print("Removed duplicate rotation handlers")

with open('drawing-world.js', 'w') as f:
    f.write(content)

print("Fixes applied")

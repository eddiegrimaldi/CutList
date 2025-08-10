#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Remove or update old gizmo cleanup code (around line 10865)
for i in range(10864, 10880):
    if i < len(lines):
        if 'if (this.positionGizmo)' in lines[i]:
            # Replace the cleanup section with GizmoManager cleanup
            for j in range(i, min(i+15, len(lines))):
                if 'if (this.scaleGizmo)' in lines[j]:
                    # Found end of cleanup section
                    lines[i:j+4] = ['''        // Clean up GizmoManager
        if (this.gizmoManager) {
            this.gizmoManager.attachToMesh(null);
        }
''']
                    break
            break

# Fix the reference at line 11698
for i in range(11695, 11700):
    if i < len(lines) and 'this.positionGizmo.attachedMesh || this.rotationGizmo.attachedMesh' in lines[i]:
        lines[i] = '        const mesh = this.gizmoManager ? this.gizmoManager.attachedMesh : null;\n'

# Remove debug code for old gizmos (around line 12083)
for i in range(12080, 12110):
    if i < len(lines) and 'if (this.positionGizmo)' in lines[i]:
        # Find the end of the debug section
        for j in range(i, min(i+30, len(lines))):
            if 'if (this.rotationGizmo)' in lines[j]:
                for k in range(j, min(j+20, len(lines))):
                    if '}' in lines[k] and 'console.log' not in lines[k]:
                        lines[i:k+1] = ['''        // Debug GizmoManager
        if (this.gizmoManager) {
            console.log('GizmoManager:', this.gizmoManager);
            console.log('- Attached Mesh:', this.gizmoManager.attachedMesh?.name);
            console.log('- Position Enabled:', this.gizmoManager.positionGizmoEnabled);
            console.log('- Rotation Enabled:', this.gizmoManager.rotationGizmoEnabled);
            console.log('- Scale Enabled:', this.gizmoManager.scaleGizmoEnabled);
        }
''']
                        break
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print("Cleaned up old gizmo references")

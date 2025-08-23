with open('TheMillSystem.js', 'r') as f:
    content = f.read()

# Fix the separator positioning to account for blade's left-edge pivot
# The blade is now pivoted at X=-100, so separators need adjustment

old_separator_section = '''            // Create separators to isolate each piece
            const separator1 = BABYLON.MeshBuilder.CreateBox('separator1', {
                width: 500,
                height: 100,
                depth: 500
            }, this.millScene);
            
            // Position separator to right of blade (accounting for rotation)
            const offset1 = new BABYLON.Vector3(0, 0, 250);
            const rotMatrix = BABYLON.Matrix.RotationY(blade.rotation.y);
            const rotatedOffset1 = BABYLON.Vector3.TransformCoordinates(offset1, rotMatrix);
            separator1.position = blade.position.clone().add(rotatedOffset1);
            separator1.rotation = blade.rotation.clone();
            
            const separator2 = BABYLON.MeshBuilder.CreateBox('separator2', {
                width: 500,
                height: 100,
                depth: 500
            }, this.millScene);
            
            // Position separator to left of blade (accounting for rotation)
            const offset2 = new BABYLON.Vector3(0, 0, -250);
            const rotatedOffset2 = BABYLON.Vector3.TransformCoordinates(offset2, rotMatrix);
            separator2.position = blade.position.clone().add(rotatedOffset2);
            separator2.rotation = blade.rotation.clone();'''

new_separator_section = '''            // Create separators to isolate each piece
            // Account for blade's left-edge pivot at X=-100
            const separator1 = BABYLON.MeshBuilder.CreateBox('separator1', {
                width: 500,
                height: 100,
                depth: 500
            }, this.millScene);
            
            // Position separator to right of blade center (blade center is at X=0 when blade.position.x=-100)
            // Since blade is 200 wide with pivot at left edge, blade center is 100 units from pivot
            const bladeCenterOffset = new BABYLON.Vector3(100, 0, 0);
            const rotMatrix = BABYLON.Matrix.RotationY(blade.rotation.y);
            const rotatedCenter = BABYLON.Vector3.TransformCoordinates(bladeCenterOffset, rotMatrix);
            const bladeCenter = blade.position.clone().add(rotatedCenter);
            
            // Now position separators relative to blade center
            const offset1 = new BABYLON.Vector3(0, 0, 250);
            const rotatedOffset1 = BABYLON.Vector3.TransformCoordinates(offset1, rotMatrix);
            separator1.position = bladeCenter.clone().add(rotatedOffset1);
            separator1.rotation = blade.rotation.clone();
            
            const separator2 = BABYLON.MeshBuilder.CreateBox('separator2', {
                width: 500,
                height: 100,
                depth: 500
            }, this.millScene);
            
            // Position separator to left of blade center
            const offset2 = new BABYLON.Vector3(0, 0, -250);
            const rotatedOffset2 = BABYLON.Vector3.TransformCoordinates(offset2, rotMatrix);
            separator2.position = bladeCenter.clone().add(rotatedOffset2);
            separator2.rotation = blade.rotation.clone();'''

content = content.replace(old_separator_section, new_separator_section)

with open('TheMillSystem.js', 'w') as f:
    f.write(content)

print('Fixed CSG separator positioning for left-edge pivot blade')

with open('TheMillSystem.js', 'r') as f:
    content = f.read()

# Make blade much longer to ensure it always cuts through entire board
old_blade_creation = """        this.blade = BABYLON.MeshBuilder.CreateBox('blade', {
            width: 200,
            height: 12,     // Full 12 inch height
            depth: 0.0078125  // 1/128 inch kerf - very thin realistic kerf
        }, this.millScene);"""

new_blade_creation = """        this.blade = BABYLON.MeshBuilder.CreateBox('blade', {
            width: 500,     // Make blade much longer to ensure full cuts at any angle
            height: 12,     // Full 12 inch height
            depth: 0.0078125  // 1/128 inch kerf - very thin realistic kerf
        }, this.millScene);"""

content = content.replace(old_blade_creation, new_blade_creation)

# Also update the pivot point since blade is now 500 wide
old_pivot = """        // Set pivot at left edge where blade intersects table (Y=0)
        // Blade is 200 wide, so left edge is at X=-100
        // Pivot must be at (-100, 0, 0) - left edge at table surface
        this.blade.setPivotMatrix(BABYLON.Matrix.Translation(-100, 0, 0));
        this.blade.position.x = -100;  // Compensate for pivot offset"""

new_pivot = """        // Set pivot at left edge where blade intersects table (Y=0)
        // Blade is 500 wide, so left edge is at X=-250
        // Pivot must be at (-250, 0, 0) - left edge at table surface
        this.blade.setPivotMatrix(BABYLON.Matrix.Translation(-250, 0, 0));
        this.blade.position.x = -250;  // Compensate for pivot offset"""

content = content.replace(old_pivot, new_pivot)

with open('TheMillSystem.js', 'w') as f:
    f.write(content)

print('Increased blade length to 500 inches to ensure complete cuts at any angle')

with open('TheMillSystem.js', 'r') as f:
    content = f.read()

# Fix 1: Update blade creation to be taller and thinner
old_blade_creation = """        this.blade = BABYLON.MeshBuilder.CreateBox('blade', {
            width: 200,
            height: 6,
            depth: 0.0625
        }, this.millScene);
        this.blade.position.y = 3;  // Lower position - blade extends below table"""

new_blade_creation = """        this.blade = BABYLON.MeshBuilder.CreateBox('blade', {
            width: 200,
            height: 12,     // Full 12 inch height
            depth: 0.0078125  // 1/128 inch kerf - very thin realistic kerf
        }, this.millScene);
        this.blade.position.y = 0;  // Center at Y=0 so blade extends -6 to +6"""

content = content.replace(old_blade_creation, new_blade_creation)

# Fix 2: Set pivot point at left edge intersection with table
old_blade_material = """        this.blade.material = bladeMat;
        this.blade.renderingGroupId = 1;  // Same layer as board for proper depth
        console.log('Blade created EARLY before physics');"""

new_blade_material = """        this.blade.material = bladeMat;
        this.blade.renderingGroupId = 1;  // Same layer as board for proper depth
        
        // Set pivot at left edge where blade intersects table (Y=0)
        // Blade is 200 wide, so left edge is at X=-100
        // Pivot must be at (-100, 0, 0) - left edge at table surface
        this.blade.setPivotMatrix(BABYLON.Matrix.Translation(-100, 0, 0));
        this.blade.position.x = -100;  // Compensate for pivot offset
        
        console.log('Blade created with pivot at left edge/table intersection');"""

content = content.replace(old_blade_material, new_blade_material)

# Fix 3: Update blade position in CSG cutting
old_csg_position = """            blade.position.set(0, 3, 0);  // Lower to ensure intersection"""
new_csg_position = """            blade.position.set(-100, 0, 0);  // Match main blade position with left edge pivot"""

content = content.replace(old_csg_position, new_csg_position)

with open('TheMillSystem.js', 'w') as f:
    f.write(content)

print('Fixed blade pivot point and kerf size')
print('- Blade now extends from Y=-6 to Y=+6')
print('- Pivot at left edge/table intersection (-100, 0, 0)')
print('- Kerf reduced to 1/128 inch (realistic thin kerf)')

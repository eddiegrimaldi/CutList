#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    content = f.read()

# Just update the createTransformDisplay to be readonly during drag
old_create = '''    createTransformDisplay() {
        // Remove any existing display
        if (this.transformDisplay) {
            this.transformDisplay.remove();
        }
        
        // Create display container
        const display = document.createElement('div');
        display.id = 'transform-display';
        display.style.position = 'fixed';
        display.style.top = '50%';
        display.style.left = '50%';
        display.style.transform = 'translate(-50%, -50%)';
        display.style.background = 'rgba(0, 0, 0, 0.8)';
        display.style.color = 'white';
        display.style.padding = '10px 20px';
        display.style.borderRadius = '5px';
        display.style.fontSize = '24px';
        display.style.fontWeight = 'bold';
        display.style.display = 'none';
        display.style.zIndex = '10000';
        display.style.pointerEvents = 'none';
        document.body.appendChild(display);
        this.transformDisplay = display;
    }'''

new_create = '''    createTransformDisplay() {
        // Remove any existing display
        if (this.transformDisplay) {
            this.transformDisplay.remove();
        }
        
        // Create simple readonly display for during drag
        const display = document.createElement('div');
        display.id = 'transform-display';
        display.style.position = 'fixed';
        display.style.background = 'rgba(0, 0, 0, 0.7)';
        display.style.color = 'white';
        display.style.padding = '4px 8px';
        display.style.borderRadius = '3px';
        display.style.fontSize = '14px';
        display.style.fontWeight = 'bold';
        display.style.display = 'none';
        display.style.zIndex = '10000';
        display.style.pointerEvents = 'none';
        document.body.appendChild(display);
        this.transformDisplay = display;
    }'''

content = content.replace(old_create, new_create)

# Update the display positioning to be near the cursor/gizmo
old_update = '''    updateTransformDisplay(value, type) {
        if (\!this.transformDisplay) return;
        
        if (type === position) {
            const x = value.x.toFixed(2);
            const y = value.y.toFixed(2);
            const z = value.z.toFixed(2);
            this.transformDisplay.textContent = Move: X: + x + \ Y: + y + \ Z: + z + \

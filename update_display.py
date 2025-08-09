#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find and update the updateTransformDisplay method
for i, line in enumerate(lines):
    if 'updateTransformDisplay(value, type)' in line:
        # Find the end of this method
        brace_count = 0
        start_idx = i
        for j in range(i, len(lines)):
            brace_count += lines[j].count('{')
            brace_count -= lines[j].count('}')
            if brace_count == 0 and j > i:
                end_idx = j + 1
                break
        
        # Replace with axis-specific display
        new_display = '''    updateTransformDisplay(value, type) {
        if (\!this.transformDisplay) return;
        
        const axis = this.currentDragAxis || 'x';
        const axisUpper = axis.toUpperCase();
        
        if (type === 'position') {
            const displayValue = value[axis] || 0;
            this.transformDisplay.textContent = 'Move ' + axisUpper + ': ' + displayValue.toFixed(2) + '"';
        } else if (type === 'rotation') {
            const displayValue = (value[axis] || 0) * 180 / Math.PI;
            this.transformDisplay.textContent = 'Rotate ' + axisUpper + ': ' + displayValue.toFixed(1) + '°';
        }
        
        this.transformDisplay.style.display = 'block';
    }
'''
        
        # Replace the method
        del lines[start_idx:end_idx]
        lines.insert(start_idx, new_display + '\n')
        print(f'Updated display at line {start_idx+1}')
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find and replace the updateTransformDisplay method
for i, line in enumerate(lines):
    if 'updateTransformDisplay(value, type)' in line:
        # Replace the method
        method_lines = '''    updateTransformDisplay(value, type) {
        if (\!this.transformDisplay) return;
        
        if (type === "position") {
            let displayValue = 0;
            if (this.currentDragAxis === 'x') displayValue = value.x;
            else if (this.currentDragAxis === 'y') displayValue = value.y;
            else if (this.currentDragAxis === 'z') displayValue = value.z;
            
            this.transformDisplay.textContent = "Move " + this.currentDragAxis.toUpperCase() + ": " + displayValue.toFixed(2) + "\"";
        } else if (type === "rotation") {
            let displayValue = 0;
            if (this.currentDragAxis === 'x') displayValue = value.x * 180 / Math.PI;
            else if (this.currentDragAxis === 'y') displayValue = value.y * 180 / Math.PI;
            else if (this.currentDragAxis === 'z') displayValue = value.z * 180 / Math.PI;
            
            this.transformDisplay.textContent = "Rotate " + this.currentDragAxis.toUpperCase() + ": " + displayValue.toFixed(1) + "°";
        }
        
        this.transformDisplay.style.display = "block";
    }
'''
        
        # Find the end of the current method
        brace_count = 0
        start_idx = i
        end_idx = i
        
        for j in range(i, min(i + 30, len(lines))):
            brace_count += lines[j].count('{')
            brace_count -= lines[j].count('}')
            if brace_count == 0 and j > i:
                end_idx = j + 1
                break
        
        # Replace the method
        del lines[start_idx:end_idx]
        lines.insert(start_idx, method_lines + '\n')
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Updated display to show only single axis')

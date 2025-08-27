#!/usr/bin/env python3

# Read the file
with open('/var/www/html/drawing-world.js', 'r') as f:
    lines = f.readlines()

# Remove all the duplicate else blocks
cleaned_lines = []
skip_next = False
duplicate_else_pattern = "} else {                    // Clicked on empty space - deselect part and clear gizmo                    if (this.selectedPart) {                        this.deselectPart();                    }"

for i, line in enumerate(lines):
    # Skip duplicate else blocks
    if line.strip() == duplicate_else_pattern:
        skip_next = False  # Don't skip, this might be the real one
        # Check if the next line is also the same pattern
        if i + 1 < len(lines) and lines[i + 1].strip() == duplicate_else_pattern:
            continue  # Skip this duplicate
    
    cleaned_lines.append(line)

# Write back
with open('/var/www/html/drawing-world.js', 'w') as f:
    f.writelines(cleaned_lines)

print("Removed duplicate else blocks")
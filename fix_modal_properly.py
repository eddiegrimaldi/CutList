#\!/usr/bin/env python3

with open('drawing-world.js', 'r') as f:
    lines = f.readlines()

# Find the modal function and ensure it's working correctly
in_modal_function = False
modal_start = -1
stored_self_line = -1

for i, line in enumerate(lines):
    if 'showTransformConfirmationModal(mesh, transformData, type)' in line:
        in_modal_function = True
        modal_start = i
    
    if in_modal_function and 'const self = this;' in line:
        stored_self_line = i
    
    # If we find the confirm button handler
    if in_modal_function and 'document.getElementById(\'transform-confirm\').onclick' in line:
        # Make sure the handler properly closes the modal
        # Find the end of this handler
        brace_count = 0
        handler_start = i
        for j in range(i, len(lines)):
            if '{' in lines[j]:
                brace_count += lines[j].count('{')
            if '}' in lines[j]:
                brace_count -= lines[j].count('}')
                if brace_count == 0 and j > i:
                    handler_end = j
                    
                    # Check if modal.remove() is there
                    has_modal_remove = False
                    for k in range(handler_start, handler_end + 1):
                        if 'modal.remove()' in lines[k]:
                            has_modal_remove = True
                            break
                    
                    if not has_modal_remove:
                        # Add it before the closing brace
                        lines.insert(handler_end, '            modal.remove();\n')
                        print('Added missing modal.remove() to confirm handler')
                    break
        break

# Also ensure Enter key handler is correct
for i, line in enumerate(lines):
    if 'input.addEventListener(\'keydown\'' in line:
        # Check the next few lines
        for j in range(i, min(i+5, len(lines))):
            if 'e.key === \'Enter\'' in lines[j]:
                # Make sure preventDefault is there
                if 'e.preventDefault()' not in lines[j+1]:
                    lines.insert(j+1, '                    e.preventDefault();\n')
                    print('Added preventDefault for Enter key')
                break
        break

with open('drawing-world.js', 'w') as f:
    f.writelines(lines)

print('Fixed modal handlers')

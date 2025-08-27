#!/usr/bin/env python3

import subprocess

# SSH command prefix
ssh_cmd = "ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com"

# Read the file
result = subprocess.run(f'{ssh_cmd} "cat /var/www/html/modules/TheMillSystem.js"', shell=True, capture_output=True, text=True)
content = result.stdout

# Add detailed error logging
old_catch = '''        } catch (error) {
            console.error('CSG cut failed:', error);
            alert('Cut failed. Please try adjusting the board position.');
        }'''

new_catch = '''        } catch (error) {
            console.error('CSG cut failed:', error);
            console.error('Error stack:', error.stack);
            console.error('Error message:', error.message);
            console.log('Current board:', this.currentBoard);
            console.log('Blade angle:', this.bladeAngle);
            console.log('Bevel angle:', this.bevelAngle);
            alert('Cut failed: ' + error.message + '. Please check console for details.');
        }'''

content = content.replace(old_catch, new_catch)

# Write the file back
subprocess.run(f'{ssh_cmd} "cat > /var/www/html/modules/TheMillSystem.js"', shell=True, input=content, text=True)

print("Added detailed error logging")
#!/usr/bin/env python3

# Quick fix for CutToolSystem.js - just fix the materialName issue for now
# The preview system issue needs a more careful approach

import os

# SSH to server and apply simple fixes
os.system('ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com "cd /var/www/html && cp modules/CutToolSystem.js modules/CutToolSystem.js.backup2"')

print("Backup created")

# Fix the undefined materialName issue only
os.system('''ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com "cd /var/www/html && sed -i 's/materialName: \\`\\${partData.materialName} (A)\\`/materialName: \\`\\${partData.materialName || partData.material?.name || \"Board\"} (A)\\`/' modules/CutToolSystem.js"''')

os.system('''ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com "cd /var/www/html && sed -i 's/materialName: \\`\\${partData.materialName} (B)\\`/materialName: \\`\\${partData.materialName || partData.material?.name || \"Board\"} (B)\\`/' modules/CutToolSystem.js"''')

print("Fixed undefined materialName issue")
print("The preview system needs Part dimensions but that requires more careful implementation")
print("For now, the original mesh bounds system should work for basic cutting")
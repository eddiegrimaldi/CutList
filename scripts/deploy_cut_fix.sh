#!/bin/bash

echo "Deploying cut positioning fixes..."

# Copy the fixed files to /var/www/html
sudo cp /home/edgrimaldi/CutToolSystem.js /var/www/html/modules/CutToolSystem.js
sudo cp /home/edgrimaldi/drawing-world.js /var/www/html/drawing-world.js

# Set proper ownership
sudo chown www-data:www-data /var/www/html/modules/CutToolSystem.js
sudo chown www-data:www-data /var/www/html/drawing-world.js

echo "Files deployed successfully!"
echo "Changes made:"
echo "1. CutToolSystem now stores calculated positions in meshGeometry.position"
echo "2. createWorkBenchMaterial now always uses meshGeometry.position if it exists"
echo ""
echo "Please refresh your browser to test the cuts."

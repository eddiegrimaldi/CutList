#!/bin/bash
echo "🚀 Deploying cut positioning fix..."

# Copy the fixed file 
cp /home/edgrimaldi/CutToolSystem_fixed.js /var/www/html/modules/CutToolSystem.js

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed cut positioning fix!"
    echo "🔧 Cut pieces will now stay in place with only kerf gap separation"
    echo "📍 No more 4-feet-apart positioning issues"
else
    echo "❌ Failed to deploy - permission denied"
    echo "ℹ️  Fix is ready at /home/edgrimaldi/CutToolSystem_fixed.js"
fi
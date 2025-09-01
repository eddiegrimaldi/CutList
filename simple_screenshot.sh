#!/bin/bash

# Start virtual display
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 &
XVFB_PID=$!
sleep 2

# Take screenshot using chromium
/snap/bin/chromium --headless --disable-gpu --screenshot=/var/www/html/screenshots/blade_test.png --window-size=1920,1080 http://localhost/workspace.php

# Kill virtual display
kill $XVFB_PID

echo "Screenshot saved to /var/www/html/screenshots/blade_test.png"

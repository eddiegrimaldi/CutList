#!/usr/bin/env python3
import subprocess
import time
import os

# Start Xvfb in background
os.system('Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &')
time.sleep(2)

# Use chromium to take screenshot
env = os.environ.copy()
env['DISPLAY'] = ':99'

cmd = [
    '/snap/bin/chromium',
    '--headless',
    '--disable-gpu', 
    '--no-sandbox',
    '--screenshot=/tmp/test.png',
    '--window-size=1920,1080',
    'http://localhost/workspace.php'
]

print("Taking screenshot...")
result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=15)

if os.path.exists('/tmp/test.png'):
    print("Screenshot saved to /tmp/test.png")
    os.system('cp /tmp/test.png /var/www/html/screenshots/')
    print("Copied to /var/www/html/screenshots/test.png")
else:
    print("Screenshot failed:", result.stderr[:500])

# Kill Xvfb
os.system('pkill Xvfb')

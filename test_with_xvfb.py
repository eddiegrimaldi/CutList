#!/usr/bin/env python3
import subprocess
import time
import os

# Start Xvfb
print("Starting virtual display...")
xvfb = subprocess.Popen(['Xvfb', ':99', '-screen', '0', '1920x1080x24'])
time.sleep(2)

# Set display
os.environ['DISPLAY'] = ':99'

try:
    # Take screenshot with chromium
    print("Taking screenshot with chromium...")
    cmd = [
        '/snap/bin/chromium',
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--screenshot=/var/www/html/screenshots/test_mill.png',
        '--window-size=1920,1080',
        'http://localhost/workspace.php'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    print("Screenshot command completed")
    
    if result.returncode == 0:
        print("Screenshot saved successfully")
    else:
        print(f"Error: {result.stderr}")
        
except subprocess.TimeoutExpired:
    print("Command timed out")
except Exception as e:
    print(f"Error: {e}")
finally:
    # Kill Xvfb
    xvfb.terminate()
    print("Virtual display terminated")

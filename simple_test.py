#!/usr/bin/env python3
import subprocess
import sys

print("Testing if we can reach localhost...")
result = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://localhost/'], capture_output=True, text=True)
print(f"HTTP response code: {result.stdout}")

# Try to use chromium directly
print("\nTrying to use chromium for screenshot...")
cmd = [
    '/snap/chromium/current/usr/lib/chromium-browser/chrome',
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--screenshot=/var/www/html/screenshots/test.png',
    '--window-size=1920,1080',
    'http://localhost/'
]

try:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    print("Screenshot command completed")
    print(f"stdout: {result.stdout}")
    if result.stderr:
        print(f"stderr: {result.stderr}")
except subprocess.TimeoutExpired:
    print("Command timed out")
except Exception as e:
    print(f"Error: {e}")

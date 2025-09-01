#!/usr/bin/env python3
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time

# Set up headless Chrome
options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-gpu')
options.add_argument('--window-size=1920,1080')

# Use snap chromium
options.binary_location = '/snap/bin/chromium'
service = Service('/snap/bin/chromium.chromedriver')

print("Starting Chrome driver...")
driver = webdriver.Chrome(service=service, options=options)

try:
    # Load a simple test page first
    print("Loading test page...")
    driver.get('http://localhost/')
    time.sleep(2)
    
    # Take screenshot
    print("Taking screenshot...")
    driver.save_screenshot('/var/www/html/screenshots/test.png')
    print("Screenshot saved!")
    
    # Get page title
    print(f"Page title: {driver.title}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    
finally:
    driver.quit()
    print("Driver closed")

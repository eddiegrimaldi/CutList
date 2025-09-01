#!/usr/bin/env python3
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

# Set up headless Chrome
options = Options()
options.add_argument('--headless=new')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-gpu')
options.add_argument('--window-size=1920,1080')
options.add_argument('--disable-blink-features=AutomationControlled')

# Path to chromium
service = Service('/snap/bin/chromium.chromedriver')

print("Starting browser...")
driver = webdriver.Chrome(service=service, options=options)

try:
    # Load workspace
    print("Loading workspace...")
    driver.get('http://localhost/workspace.php')
    time.sleep(5)
    
    # Execute JavaScript to open the mill with a board
    print("Opening The Mill...")
    driver.execute_script('''
        // Create a test board if none exists
        if (!window.drawingWorld.workBenchParts || window.drawingWorld.workBenchParts.length === 0) {
            const board = {
                id: 'test_board',
                type: 'board',
                dimensions: { length: 243.84, width: 15.24, thickness: 1.905 },
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            };
            window.drawingWorld.workBenchParts = [board];
        }
        
        // Open the mill with first board
        if (window.theMillSystem) {
            window.theMillSystem.openMill(window.drawingWorld.workBenchParts[0]);
        }
    ''')
    
    time.sleep(3)
    
    # Adjust bevel slider to activate split screen
    print("Adjusting bevel slider...")
    driver.execute_script('''
        const slider = document.getElementById('bevel-slider');
        if (slider) {
            slider.value = 30;
            slider.dispatchEvent(new Event('input'));
        }
    ''')
    
    time.sleep(2)
    
    # Take screenshot
    print("Taking screenshot...")
    os.makedirs('/var/www/html/screenshots', exist_ok=True)
    driver.save_screenshot('/var/www/html/screenshots/mill_blade_view.png')
    
    # Get console logs about camera position
    logs = driver.execute_script('''
        return window.consoleCapture || [];
    ''')
    
    print("\nConsole output:")
    for log in logs[-10:]:
        print(log)
    
    print("\nScreenshot saved to /var/www/html/screenshots/mill_blade_view.png")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    
finally:
    driver.quit()

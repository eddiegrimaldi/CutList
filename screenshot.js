const puppeteer = require('puppeteer');

async function takeScreenshot(url, outputPath) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: '/usr/bin/chromium-browser'
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for 3D scene to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: outputPath });
    
    await browser.close();
    console.log('Screenshot saved to:', outputPath);
}

// Usage
const url = process.argv[2] || 'http://localhost/workspace.php';
const output = process.argv[3] || '/var/www/html/screenshots/mill-view.png';

takeScreenshot(url, output).catch(console.error);

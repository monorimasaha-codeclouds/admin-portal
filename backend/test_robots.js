const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testRobots() {
    console.log('Starting robots.txt test...');
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    try {
        const page = await browser.newPage();
        const url = 'https://blowoutcartdirect.com/robots.txt';
        console.log(`Visiting: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('Page loaded, taking screenshot...');
        const ssPath = path.join(__dirname, 'robots_test.png');
        await page.screenshot({ path: ssPath });
        console.log(`Screenshot saved to: ${ssPath}`);
    } catch (e) {
        console.error('Test failed:', e.message);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

testRobots();

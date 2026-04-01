const puppeteer = require('puppeteer');
const path = require('path');

async function testStateSelection() {
    console.log('Starting State Selection Test...');
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    try {
        const page = await browser.newPage();
        const url = 'https://primemarketnetwork.com/v1/marshalldge/';
        console.log(`Visiting: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        const selector = '#shippingState';
        const value = 'California';
        
        console.log(`Attempting to select ${value} for ${selector}...`);
        
        // Enhanced logic (with fix)
        await page.evaluate((sel, val) => {
            const select = document.querySelector(sel);
            if (select) {
                console.log('Found select element');
                // Remove readonly/disabled if present
                select.removeAttribute('readonly');
                select.disabled = false;
                
                const option = Array.from(select.options).find(o =>
                    o.value.toLowerCase().includes(val.toLowerCase()) ||
                    o.text.toLowerCase().includes(val.toLowerCase())
                );
                if (option) {
                    console.log('Found option:', option.text);
                    select.value = option.value;
                    
                    // Dispatch events
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.dispatchEvent(new Event('blur', { bubbles: true }));
                } else {
                    console.log('Option not found');
                }
            } else {
                console.log('Select element not found');
            }
        }, selector, value);

        await new Promise(r => setTimeout(r, 3000));
        
        const screenshotPath = path.join(__dirname, 'state_test_before_fix.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);
        
        const selectedValue = await page.evaluate((sel) => document.querySelector(sel).value, selector);
        console.log('Selected Value:', selectedValue);

    } catch (e) {
        console.error('Test failed:', e.message);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

testStateSelection();

const puppeteer = require('puppeteer');
const path = require('path');

async function testCardEntry() {
    console.log('Starting Card Entry Test...');
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    try {
        const page = await browser.newPage();
        const url = 'https://primemarketnetwork.com/v1/marshalldge/';
        console.log(`Visiting: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Fill personal info just to get to checkout state (though it might be one-page)
        // Assume it's one-page for now as seen in screenshots.
        
        const cardNumSelectors = ['#creditCardNumber', 'input[name*="creditCardNumber"]'];
        const cardNumber = '1444444444444446';
        
        console.log(`Entering Card Number: ${cardNumber}...`);
        
        const selector = '#creditCardNumber';
        await page.waitForSelector(selector);
        
        // Method 1: Type like a user
        await page.focus(selector);
        for (const char of cardNumber) {
            await page.keyboard.sendCharacter(char);
            await new Promise(r => setTimeout(r, 50));
        }
        await page.keyboard.press('Tab');

        await new Promise(r => setTimeout(r, 3000));
        
        const screenshotPath = path.join(__dirname, 'card_type_check.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);
        
        const cardTypeVal = await page.evaluate(() => {
            const sel = document.querySelector('#creditCardType');
            return sel ? { value: sel.value, text: sel.options[sel.selectedIndex].text } : 'Not found';
        });
        console.log('Card Type Selection:', cardTypeVal);

    } catch (e) {
        console.error('Test failed:', e.message);
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

testCardEntry();

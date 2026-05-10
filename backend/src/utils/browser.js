const puppeteer = require('puppeteer-core');

/**
 * Returns a connected/launched Puppeteer browser instance.
 * Automatically handles the Vercel vs local environment difference.
 */
async function getBrowser() {
    const token = process.env.BROWSERLESS_TOKEN;
    
    // Comprehensive check for Vercel and other serverless environments
    const isServerless = 
        process.env.VERCEL || 
        process.env.NOW_REGION || 
        process.env.AWS_LAMBDA_FUNCTION_NAME || 
        process.env.FUNCTION_NAME;

    console.log(`[Browser] Debug - Token Present: ${!!token}, Serverless Detected: ${!!isServerless}`);

    if (token) {
        console.log('[Browser] Connecting to Browserless.io (remote mode)...');
        return puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${token}`,
        });
    }

    if (isServerless) {
        throw new Error(
            'CRITICAL: BROWSERLESS_TOKEN is missing in Vercel environment variables. ' +
            'Browser automation cannot run on Vercel without a remote browser. ' +
            'Please add BROWSERLESS_TOKEN to your Vercel Project Settings.'
        );
    }

    // Local development: use @sparticuz/chromium
    console.log('[Browser] Launching local Chromium (development mode)...');
    const chromium = require('@sparticuz/chromium');
    return puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });
}

module.exports = { getBrowser };

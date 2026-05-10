/**
 * browser.js — Centralized browser factory for Puppeteer.
 *
 * On Vercel (or any serverless env), we MUST use a remote browser via Browserless.io
 * because the local filesystem is read-only and system libraries like libnss3 are missing.
 *
 * Locally, it falls back to launching a local Chromium via @sparticuz/chromium.
 *
 * REQUIRED: Set BROWSERLESS_TOKEN environment variable in Vercel Dashboard.
 */

const puppeteer = require('puppeteer-core');

/**
 * Returns a connected/launched Puppeteer browser instance.
 * Automatically handles the Vercel vs local environment difference.
 */
async function getBrowser() {
    const token = process.env.BROWSERLESS_TOKEN;
    const isVercel = !!process.env.VERCEL;

    if (token) {
        console.log('[Browser] Connecting to Browserless.io (remote)...');
        return puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${token}`,
        });
    }

    if (isVercel) {
        throw new Error(
            'Running on Vercel but BROWSERLESS_TOKEN is not set. ' +
            'Please add BROWSERLESS_TOKEN to your Vercel Environment Variables. ' +
            'Get a free token at https://www.browserless.io/'
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

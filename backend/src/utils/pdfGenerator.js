const puppeteer = require('puppeteer-core');
const { getBrowser } = require('./browser');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { getWritableDir } = require('./paths');
const https = require('https');

// Helper to check robots.txt
async function checkRobotsTxt(baseUrl) {
    return new Promise((resolve) => {
        const req = https.get(`${baseUrl}/robots.txt`, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
    });
}

const VIEWPORTS = {
    desktop: { width: 1440, height: 900, isMobile: false },
    ipad: { width: 820, height: 1180, isMobile: true, hasTouch: true }, // iPad Air
    iphone: { width: 430, height: 932, isMobile: true, hasTouch: true }, // iPhone 14 Pro Max
    android: { width: 412, height: 915, isMobile: true, hasTouch: true } // Pixel/Galaxy
};

// Helper to Convert Image to Base64
function toBase64(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return null;
    try {
        const bitmap = fs.readFileSync(filePath);
        return `data:image/png;base64,${Buffer.from(bitmap).toString('base64')}`;
    } catch (e) {
        return null;
    }
}

/**
 * Generates a PDF report for a project.
 */
async function generateTestReport(data) {
    // Correctly extract properties passed from projects.js
    const projectId = data.projectId || data.id;
    const projectName = data.projectName || data.name;
    const offerUrl = data.offerUrl || data.url;
    const automationResults = data.automationResults;

    if (!offerUrl) {
        throw new Error('[PDF Gen] Cannot generate report: offerUrl is missing.');
    }

    const screenshots = { desktop: null, ipad: null, iphone: null, android: null };
    const browser = await getBrowser();
    
    try {
        if (!automationResults) {
            console.log('[PDF Gen] No automation results provided, capturing fresh screenshots...');
            const page = await browser.newPage();
            await new Promise(r => setTimeout(r, 1000));

            const captureViewport = async (deviceType, viewport) => {
                try {
                    await page.setViewport(viewport);
                    await page.goto(offerUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                    await new Promise(r => setTimeout(r, 1000));
                    const tempDir = getWritableDir('temp_screenshots');
                    const ssPath = path.join(tempDir, `${projectId}_${deviceType}_${Date.now()}.png`);
                    await page.screenshot({ path: ssPath, fullPage: false });
                    return ssPath;
                } catch (e) {
                    console.error(`[PDF Gen] Failed to capture ${deviceType} screenshot:`, e.message);
                    return null;
                }
            };

            screenshots.desktop = await captureViewport('desktop', VIEWPORTS.desktop);
            screenshots.ipad = await captureViewport('ipad', VIEWPORTS.ipad);
            screenshots.iphone = await captureViewport('iphone', VIEWPORTS.iphone);
            screenshots.android = await captureViewport('android', VIEWPORTS.android);
            await page.close();
        }

        // ── Check Robots.txt ──
        let robotsTxtStatus = 'FAIL';
        let robotsTxtScreenshot = null;
        try {
            const urlObj = new URL(offerUrl);
            const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
            const robotsUrl = `${baseUrl}/robots.txt`;
            const hasRobots = await checkRobotsTxt(baseUrl);
            robotsTxtStatus = hasRobots ? 'PASS' : 'FAIL';

            if (hasRobots) {
                console.log(`[PDF Gen] Capturing robots.txt screenshot: ${robotsUrl}`);
                const robotsPage = await browser.newPage();
                await new Promise(r => setTimeout(r, 1000));
                await robotsPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
                await robotsPage.setViewport({ width: 1024, height: 768 });
                
                try {
                    await robotsPage.goto(robotsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    await new Promise(r => setTimeout(r, 1000));
                    const tempDir = getWritableDir('temp_screenshots');
                    const ssPath = path.join(tempDir, `robots_${projectId}_${Date.now()}.png`);
                    await robotsPage.screenshot({ path: ssPath });
                    robotsTxtScreenshot = toBase64(ssPath);
                    if (fs.existsSync(ssPath)) fs.unlinkSync(ssPath);
                } catch (navErr) {
                    console.error(`[PDF Gen] Robots screenshot navigation failed: ${navErr.message}`);
                }
                await robotsPage.close();
            }
        } catch (e) {
            console.error('[PDF Gen] Failed to check robots.txt:', e.message);
        }

        // ── Prepare Template Data ──
        const isHttps = offerUrl.startsWith('https://') ? 'PASS' : 'FAIL';
        let consoleIssues = { desktop: [], mobile: [] };
        if (automationResults?.[0]?.consoleIssues) {
            const raw = automationResults[0].consoleIssues;
            const convert = (list) => (list || []).map(i => ({ ...i, screenshotPath: toBase64(i.screenshotPath) }));
            consoleIssues.desktop = convert(raw.desktop);
            consoleIssues.mobile = convert(raw.mobile);
        }

        const templateData = {
            projectName, offerUrl, consoleIssues,
            automationResults: (automationResults || []).map(res => ({
                ...res, 
                screenshot: toBase64(res.screenshot),
                landing_page_screenshot: toBase64(res.landing_page_screenshot)
            })),
            funnelNotes: [
                "For VISA card entry A MASTERCARD popup will be displayed, which can be cancelled.",
                "For non-affiliate url a pop-up will be shown that orders can't proceed.",
                "[Blank page should not be shown while the user not pass affid]"
            ],
            usability: { 
                windows: { status: 'FAIL' }, mac: { status: 'FAIL' }, 
                ios: { ipad: 'FAIL', iphone: 'FAIL' }, android: { tablet: 'PASS', phone: 'FAIL' },
                inApp: { facebook: 'PASS', skype: 'PASS' }, zoomIssue: 'FAIL'
            },
            uiUx: { 
                formElements: 'PASS', buttonsAccessible: 'PASS', spelling: 'PASS', 
                tabIndexing: 'PASS', popups: 'PASS', favicon: 'PASS', 
                responsiveness: 'PASS', copyright: 'FAIL' 
            },
            autoChecks: { https: isHttps, robotsTxt: robotsTxtStatus, robotsTxtScreenshot },
            images: {
                desktop: toBase64(screenshots.desktop), ipad: toBase64(screenshots.ipad),
                iphone: toBase64(screenshots.iphone), android: toBase64(screenshots.android)
            }
        };

        // ── Render and Generate PDF ──
        console.log('[PDF Gen] Rendering EJS and generating PDF...');
        const templatePath = path.join(__dirname, 'report_template.ejs');
        const renderedHtml = ejs.render(fs.readFileSync(templatePath, 'utf8'), templateData);
        
        const pdfPage = await browser.newPage();
        await new Promise(r => setTimeout(r, 1000));
        
        const tempHtmlPath = path.join(getWritableDir('reports'), `temp_${projectId}_${Date.now()}.html`);
        fs.writeFileSync(tempHtmlPath, renderedHtml);

        try {
            await pdfPage.goto(`file://${tempHtmlPath}`, { waitUntil: 'load', timeout: 60000 });
        } catch (e) {
            await pdfPage.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
        }
        
        const outputPath = path.join(getWritableDir('reports'), `${projectId}_report.pdf`);
        await pdfPage.pdf({
            path: outputPath, format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            printBackground: true
        });

        // Cleanup
        if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        if (!automationResults) {
            Object.values(screenshots).forEach(p => p && fs.existsSync(p) && fs.unlinkSync(p));
        }

        return outputPath;
    } finally {
        await browser.close();
    }
}

module.exports = { generateTestReport };

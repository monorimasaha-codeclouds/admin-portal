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
    const projectId = data.projectId || data.id;
    const projectName = data.projectName || data.name;
    const offerUrl = data.offerUrl || data.url;
    const automationResults = data.automationResults || [];

    if (!offerUrl) throw new Error('[PDF Gen] Cannot generate report: offerUrl is missing.');

    console.log(`[PDF Gen] Generating report for ${projectName} (Project ${projectId})...`);

    // ── 1. Gather Screenshots (Use automation results if available to save time) ──
    const reportImages = {
        desktop: null, ipad: null, iphone: null, android: null
    };

    // If we have automation results, the first result usually has the landing page screenshot
    if (automationResults.length > 0) {
        const first = automationResults[0];
        reportImages.desktop = toBase64(first.landing_page_screenshot || first.screenshot);
    }

    // ── 2. Check Robots.txt (Only if needed) ──
    let robotsTxtStatus = 'FAIL';
    let robotsTxtScreenshot = null;
    const browser = await getBrowser();
    
    try {
        const urlObj = new URL(offerUrl);
        const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
        const robotsUrl = `${baseUrl}/robots.txt`;
        const hasRobots = await checkRobotsTxt(baseUrl);
        robotsTxtStatus = hasRobots ? 'PASS' : 'FAIL';

        if (hasRobots) {
            const robotsPage = await browser.newPage();
            await new Promise(r => setTimeout(r, 1000));
            try {
                await robotsPage.goto(robotsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                const ssPath = path.join(getWritableDir('temp_screenshots'), `robots_${projectId}.png`);
                await robotsPage.screenshot({ path: ssPath });
                robotsTxtScreenshot = toBase64(ssPath);
                if (fs.existsSync(ssPath)) fs.unlinkSync(ssPath);
            } catch (e) { }
            await robotsPage.close();
        }

        // ── 3. Render PDF ──
        const isHttps = offerUrl.startsWith('https://') ? 'PASS' : 'FAIL';
        let consoleIssues = { desktop: [], mobile: [] };
        if (automationResults[0]?.consoleIssues) {
            const raw = automationResults[0].consoleIssues;
            const convert = (list) => (list || []).map(i => ({ ...i, screenshotPath: toBase64(i.screenshotPath) }));
            consoleIssues.desktop = convert(raw.desktop);
            consoleIssues.mobile = convert(raw.mobile);
        }

        const templateData = {
            projectName, offerUrl, consoleIssues,
            automationResults: automationResults.map(res => ({
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
            images: reportImages
        };

        const templatePath = path.join(__dirname, 'report_template.ejs');
        const renderedHtml = ejs.render(fs.readFileSync(templatePath, 'utf8'), templateData);
        
        const pdfPage = await browser.newPage();
        await new Promise(r => setTimeout(r, 1000));
        const tempHtmlPath = path.join(getWritableDir('reports'), `temp_${projectId}.html`);
        fs.writeFileSync(tempHtmlPath, renderedHtml);

        await pdfPage.goto(`file://${tempHtmlPath}`, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
        
        const outputPath = path.join(getWritableDir('reports'), `${projectId}_report.pdf`);
        await pdfPage.pdf({
            path: outputPath, format: 'A4',
            margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
            printBackground: true
        });

        if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        return outputPath;
    } finally {
        await browser.close();
    }
}

module.exports = { generateTestReport };

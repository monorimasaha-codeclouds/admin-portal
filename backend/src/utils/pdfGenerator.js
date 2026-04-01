const puppeteer = require('puppeteer');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
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
const toBase64 = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const b64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const ext = path.extname(filePath).replace('.', '') || 'png';
    return `data:image/${ext};base64,${b64}`;
};

async function generateTestReport(projectParams) {
    const { projectId, offerUrl, projectName, automationResults } = projectParams;

    console.log(`[PDF Gen] Starting report generation for Project: ${projectId}`);
    
    // If we have automation results, we use them for the screenshots
    // Otherwise we fallback to the old viewport capture logic
    
    let screenshots = {
        desktop: null,
        ipad: null,
        iphone: null,
        android: null
    };

    if (!automationResults) {
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Helper to capture a specific viewport
        const captureViewport = async (deviceType, viewport) => {
            try {
                await page.setViewport(viewport);
                await page.goto(offerUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 1000));
                
                const tempDir = path.join(__dirname, '../temp_screenshots');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const ssFilename = `${projectId}_${deviceType}_${Date.now()}.png`;
                const ssPath = path.join(tempDir, ssFilename);
                await page.screenshot({ path: ssPath, fullPage: false });
                return ssPath;
            } catch (e) {
                console.error(`[PDF Gen] Failed to capture ${deviceType} screenshot:`, e.message);
                return null;
            }
        };

        console.log('[PDF Gen] Capturing views for default report...');
        screenshots.desktop = await captureViewport('desktop', VIEWPORTS.desktop);
        screenshots.ipad = await captureViewport('ipad', VIEWPORTS.ipad);
        screenshots.iphone = await captureViewport('iphone', VIEWPORTS.iphone);
        screenshots.android = await captureViewport('android', VIEWPORTS.android);

        await browser.close();
    }

    // Check if HTTPS
    const isHttps = offerUrl.startsWith('https://') ? 'PASS' : 'FAIL';
    
    // Check robots.txt and take screenshot
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
            const robotsBrowser = await puppeteer.launch({ 
                headless: "new", 
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
            });
            const robotsPage = await robotsBrowser.newPage();
            await robotsPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
            await robotsPage.setViewport({ width: 1024, height: 768 });
            
            try {
                await robotsPage.goto(robotsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                await new Promise(r => setTimeout(r, 2000)); // Buffer for rendering
                
                const tempDir = path.join(__dirname, '../temp_screenshots');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                const ssPath = path.join(tempDir, `robots_${projectId}_${Date.now()}.png`);
                await robotsPage.screenshot({ path: ssPath });
                robotsTxtScreenshot = toBase64(ssPath);
                if (fs.existsSync(ssPath)) fs.unlinkSync(ssPath);
            } catch (navErr) {
                console.error(`[PDF Gen] Robots screenshot navigation failed: ${navErr.message}`);
            }
            await robotsBrowser.close();
        }
    } catch (e) {
        console.error('[PDF Gen] Failed to check robots.txt or take screenshot:', e.message);
    }

    // Helper to Convert Image to Base64 (moved to top)

    // ── Extract Console Issues from automation results ──
    let consoleIssues = { desktop: [], mobile: [] };
    if (automationResults && automationResults.length > 0 && automationResults[0].consoleIssues) {
        const raw = automationResults[0].consoleIssues;
        // Convert screenshot paths to base64 for embedding in PDF
        const convertIssues = (issueList) => (issueList || []).map(issue => ({
            ...issue,
            screenshotPath: issue.screenshotPath ? toBase64(issue.screenshotPath) : null
        }));
        consoleIssues.desktop = convertIssues(raw.desktop);
        consoleIssues.mobile = convertIssues(raw.mobile);
    }

    // Prepare data for EJS template
    const templateData = {
        projectName: projectName,
        offerUrl: offerUrl,
        automationResults: (automationResults || []).map(res => ({
            ...res,
            screenshot: toBase64(res.screenshot),
            landing_page_screenshot: toBase64(res.landing_page_screenshot)
        })),
        consoleIssues: consoleIssues,
        funnelNotes: [
            "For VISA card entry A MASTERCARD popup will be displayed, which can be cancelled.",
            "For non-affiliate url a pop-up will be shown that orders can't proceed.",
            "[Blank page should not be shown while the user not pass affid]"
        ],
        usability: {
            windows: { status: 'FAIL' },
            mac: { status: 'FAIL' },
            ios: { ipad: 'FAIL', iphone: 'FAIL' },
            android: { tablet: 'PASS', phone: 'FAIL' },
            inApp: { facebook: 'PASS', skype: 'PASS' },
            zoomIssue: 'FAIL'
        },
        uiUx: {
            formElements: 'PASS',
            buttonsAccessible: 'PASS',
            spelling: 'PASS',
            tabIndexing: 'PASS',
            popups: 'PASS',
            favicon: 'PASS',
            responsiveness: 'PASS',
            copyright: 'FAIL'
        },
        autoChecks: {
            https: isHttps,
            robotsTxt: robotsTxtStatus,
            robotsTxtScreenshot: robotsTxtScreenshot
        },
        images: {
            desktop: toBase64(screenshots.desktop),
            ipad: toBase64(screenshots.ipad),
            iphone: toBase64(screenshots.iphone),
            android: toBase64(screenshots.android)
        }
    };

    console.log('[PDF Gen] Rendering EJS template...');
    const templatePath = path.join(__dirname, 'report_template.ejs');
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const renderedHtml = ejs.render(templateHtml, templateData);
    
    // Generate the actual PDF
    console.log('[PDF Gen] Compiling HTML to PDF...');
    const pdfBrowser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const pdfPage = await pdfBrowser.newPage();
    
    // Switch to file-based rendering for large HTML (more robust than setContent)
    const tempHtmlPath = path.join(__dirname, `../../reports/temp_${projectId}_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, renderedHtml);

    try {
        await pdfPage.goto(`file://${tempHtmlPath}`, { 
            waitUntil: 'load', 
            timeout: 120000 
        });
    } catch (e) {
        console.error('[PDF Gen] compilation error (retrying with networkidle2):', e.message);
        await pdfPage.goto(`file://${tempHtmlPath}`, { 
            waitUntil: 'networkidle2', 
            timeout: 120000 
        }).catch(() => {});
    }
    
    // Use the reports directory we already know about
    const outputPath = path.join(__dirname, `../../reports/${projectId}_report.pdf`);
    const reportsDir = path.dirname(outputPath);
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    await pdfPage.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        printBackground: true
    });
    
    await pdfBrowser.close();

    // Clean up temporary HTML file
    if (fs.existsSync(tempHtmlPath)) {
        try { fs.unlinkSync(tempHtmlPath); } catch (e) { }
    }
    
    // Clean up temporary screenshots (if fallback logic was used)
    if (!automationResults) {
        Object.values(screenshots).forEach(ssPath => {
            if (ssPath && fs.existsSync(ssPath)) {
                fs.unlinkSync(ssPath);
            }
        });
    }
    
    console.log(`[PDF Gen] Success! PDF saved to: ${outputPath}`);
    return outputPath;
}

module.exports = {
    generateTestReport
};

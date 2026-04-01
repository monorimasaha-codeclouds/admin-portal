const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ─── Console Issue Helpers ────────────────────────────────────────────────

/**
 * Attach deep console listeners using CDP session + standard Puppeteer events.
 * Captures: Runtime errors, Log entries, Audit issues (cookie/deprecation),
 * network failures (4xx/5xx), and uncaught page errors.
 * Call collector.flush(pageName) to snapshot accumulated issues and reset.
 */
async function attachConsoleCollector(page) {
    const messages = [];

    // ── CDP-based deep capture ──
    const cdp = await page.createCDPSession();
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    try { await cdp.send('Audits.enable'); } catch (e) { /* older Chrome */ }

    // Runtime.consoleAPICalled — catches console.error(), console.warn(), etc.
    cdp.on('Runtime.consoleAPICalled', event => {
        const type = event.type; // 'error', 'warning', 'log', etc.
        if (type === 'error' || type === 'warning') {
            messages.push({
                type: type === 'warning' ? 'warning' : 'error',
                text: event.args.map(a => a.value || a.description || '').join(' '),
                location: event.stackTrace?.callFrames?.[0]?.url || ''
            });
        }
    });

    // Runtime.exceptionThrown — uncaught JS exceptions
    cdp.on('Runtime.exceptionThrown', event => {
        const details = event.exceptionDetails;
        messages.push({
            type: 'error',
            text: details.text + (details.exception ? ': ' + (details.exception.description || '') : ''),
            location: details.url || ''
        });
    });

    // Log.entryAdded — browser-level log entries (network errors, violations, etc.)
    cdp.on('Log.entryAdded', event => {
        const entry = event.entry;
        if (entry.level === 'error' || entry.level === 'warning') {
            messages.push({
                type: entry.level,
                text: entry.text || '',
                location: entry.url || ''
            });
        }
    });

    // Audits.issueAdded — deprecation warnings, cookie issues, etc.
    cdp.on('Audits.issueAdded', event => {
        const issue = event.issue;
        let text = '';
        if (issue.code === 'CookieIssue') {
            const d = issue.details?.cookieIssueDetails;
            text = `Cookie issue: ${d?.cookie?.name || 'unknown'} (${(d?.cookieWarningReasons || []).join(', ')})`;
        } else if (issue.code === 'DeprecationIssue') {
            text = `Deprecation: ${issue.details?.deprecationIssueDetails?.message || issue.code}`;
        } else {
            text = `Audit issue: ${issue.code}`;
        }
        messages.push({ type: 'warning', text, location: '' });
    });

    // ── Standard Puppeteer events as fallback ──
    page.on('pageerror', error => {
        messages.push({
            type: 'error',
            text: error.message || String(error),
            location: ''
        });
    });

    // Track network failures (4xx/5xx responses, failed requests)
    page.on('requestfailed', req => {
        messages.push({
            type: 'error',
            text: `Network request failed: ${req.failure()?.errorText || 'unknown'} — ${req.url().substring(0, 200)}`,
            location: req.url()
        });
    });

    page.on('response', res => {
        if (res.status() >= 400) {
            messages.push({
                type: 'error',
                text: `Failed to load resource: server responded with status ${res.status()} — ${res.url().substring(0, 200)}`,
                location: res.url()
            });
        }
    });

    return {
        /** Return accumulated issues since the last flush, then clear. */
        flush(pageName) {
            // Deduplicate messages by text (CDP + page events can fire duplicates)
            const seen = new Set();
            const deduped = messages.filter(m => {
                const key = m.type + '||' + m.text;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            const snapshot = {
                pageName,
                errors: deduped.filter(m => m.type === 'error').map(m => ({ text: m.text, location: m.location })),
                warnings: deduped.filter(m => m.type === 'warning').map(m => ({ text: m.text, location: m.location }))
            };
            messages.length = 0; // reset
            return snapshot;
        },
        /** Peek at current count without flushing */
        hasIssues() {
            return messages.length > 0;
        }
    };
}

/**
 * Generate a composite screenshot: page screenshot on the left, styled console panel on the right.
 * Uses a fresh Puppeteer page to render an HTML layout that matches the reference image.
 */
async function createCompositeScreenshot(browser, pageScreenshotPath, consoleSnapshot, outputPath) {
    const pageImgB64 = fs.readFileSync(pageScreenshotPath, { encoding: 'base64' });
    const pageImgSrc = `data:image/png;base64,${pageImgB64}`;

    // Build console entries HTML
    const entries = [
        ...consoleSnapshot.errors.map(e => ({ type: 'error', text: e.text, location: e.location })),
        ...consoleSnapshot.warnings.map(w => ({ type: 'warning', text: w.text, location: w.location }))
    ];

    const entriesHtml = entries.map(e => {
        const icon = e.type === 'error' ? '⛔' : '⚠️';
        const bgColor = e.type === 'error' ? '#290000' : '#332b00';
        const borderColor = e.type === 'error' ? '#5c0000' : '#665500';
        const textColor = e.type === 'error' ? '#ff8080' : '#ffdd57';
        const escapedText = e.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapedLoc = e.location ? e.location.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        return `
            <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:6px 10px; margin-bottom:2px; font-size:11px; color:${textColor}; word-break:break-all;">
                ${icon} ${escapedText}
                ${escapedLoc ? `<span style="color:#888; font-size:10px; display:block; margin-top:2px;">${escapedLoc}</span>` : ''}
            </div>`;
    }).join('');

    const errorCount = consoleSnapshot.errors.length;
    const warningCount = consoleSnapshot.warnings.length;

    const compositeHtml = `<!DOCTYPE html>
    <html><head><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { display:flex; min-height:100vh; background:#1e1e1e; font-family: 'Consolas','Courier New',monospace; }
        .page-panel { flex:1; background:#fff; position: relative; }
        .page-panel img { width:100%; height:auto; display:block; }
        .console-panel { width:450px; background:#1e1e1e; display:flex; flex-direction:column; border-left:2px solid #3c3c3c; min-height: 100vh; }
        .console-header {
            background:#2d2d2d; padding:8px 12px; display:flex; align-items:center; gap:12px;
            border-bottom:1px solid #3c3c3c; font-size:12px; color:#ccc;
            position: sticky; top: 0; z-index: 10;
        }
        .console-header .tab { padding:4px 10px; background:#1e1e1e; border-radius:3px; color:#fff; font-weight:bold; }
        .console-header .badge-error { background:#c0392b; color:#fff; padding:2px 6px; border-radius:8px; font-size:10px; }
        .console-header .badge-warn { background:#e67e22; color:#fff; padding:2px 6px; border-radius:8px; font-size:10px; }
        .console-summary {
            background:#252525; padding:6px 12px; border-bottom:1px solid #333; font-size:11px; color:#aaa;
            position: sticky; top: 35px; z-index: 10;
        }
        .console-body { flex:1; padding:4px; }
    </style></head>
    <body>
        <div class="page-panel">
            <img src="${pageImgSrc}" />
        </div>
        <div class="console-panel">
            <div class="console-header">
                <span>Elements</span>
                <span class="tab">Console</span>
                <span>Network</span>
                ${errorCount > 0 ? `<span class="badge-error">${errorCount} error${errorCount > 1 ? 's' : ''}</span>` : ''}
                ${warningCount > 0 ? `<span class="badge-warn">${warningCount} warning${warningCount > 1 ? 's' : ''}</span>` : ''}
            </div>
            <div class="console-summary">
                ${errorCount + warningCount} issue${(errorCount + warningCount) !== 1 ? 's' : ''} found &nbsp;|&nbsp;
                <span style="color:#ff8080">⛔ ${errorCount} error${errorCount !== 1 ? 's' : ''}</span> &nbsp;
                <span style="color:#ffdd57">⚠️ ${warningCount} warning${warningCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="console-body">
                ${entriesHtml}
            </div>
        </div>
    </body></html>`;

    const compositePage = await browser.newPage();
    // Use a taller viewport to ensure the Thank You page content is visible
    await compositePage.setViewport({ width: 1600, height: 1200 });
    await compositePage.setContent(compositeHtml, { waitUntil: 'load' });

    // Auto-adjust height to content
    const bodyHeight = await compositePage.evaluate(() => document.body.scrollHeight);
    await compositePage.setViewport({ width: 1600, height: Math.min(bodyHeight, 3000) });

    await compositePage.screenshot({ path: outputPath, fullPage: true });
    await compositePage.close();
}

/**
 * Run a console-check pass for a given viewport on the landing page URL.
 * Returns an array of { pageName, errors, warnings, screenshotPath } per page visited.
 */
async function checkConsoleForViewport(browser, offerUrl, projectId, viewportName, viewport, ssDir) {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    const collector = await attachConsoleCollector(page);
    const issues = [];

    // Helper to snapshot a page
    const snapshotPage = async (pageName) => {
        const snapshot = collector.flush(pageName);
        if (snapshot.errors.length > 0 || snapshot.warnings.length > 0) {
            // Take a page screenshot first
            const rawSS = path.join(ssDir, `console_raw_${projectId}_${viewportName}_${pageName}_${Date.now()}.png`);
            try {
                await page.screenshot({ path: rawSS, fullPage: true });
            } catch (ssErr) {
                console.log(`[Console Check] fullPage screenshot failed, using fallback: ${ssErr.message}`);
                try { await page.screenshot({ path: rawSS }); } catch (e) { }
            }

            // Create the composite screenshot
            const compositeSS = path.join(ssDir, `console_${projectId}_${viewportName}_${pageName}_${Date.now()}.png`);
            await createCompositeScreenshot(browser, rawSS, snapshot, compositeSS);

            // Remove raw screenshot
            if (fs.existsSync(rawSS)) fs.unlinkSync(rawSS);

            snapshot.screenshotPath = compositeSS;
        }
        issues.push(snapshot);
    };

    try {
        // ── Landing Page ──
        await page.goto(offerUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000)); // Let async scripts run
        await snapshotPage('Landing Page');

        // ── Try to navigate to checkout ──
        const continueSelectors = ['.form_sub', '#submitBtn', 'button.btn-custom', 'button[type="submit"]', 'input[type="submit"]', '#continue-btn'];
        let navigated = false;
        for (const sel of continueSelectors) {
            try {
                const btn = await page.$(sel);
                if (btn) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => { }),
                        btn.click()
                    ]);
                    navigated = true;
                    break;
                }
            } catch (e) { /* next */ }
        }

        if (!navigated) {
            // Fallback: try evaluating a click
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                const btn = btns.find(b => /continue|form_sub|submit/i.test(b.className + b.textContent + b.value));
                if (btn) btn.click();
            });
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => { });
        }

        await new Promise(r => setTimeout(r, 2000));

        // Only snapshot if we actually moved to a new page
        const currentUrl = page.url();
        if (currentUrl !== offerUrl) {
            const pageName = currentUrl.toLowerCase().includes('checkout') ? 'Checkout Page' :
                currentUrl.toLowerCase().includes('thank') ? 'Thank You Page' : 'Next Page';
            await snapshotPage(pageName);
        }

    } catch (err) {
        console.error(`[Console Check][${viewportName}] Error:`, err.message);
    } finally {
        await page.close();
    }

    return issues;
}

// ─── Main Automation Function ─────────────────────────────────────────────

async function runAutomation(project, cards) {
    const results = [];
    const offerUrl = project.links && project.links.length > 0 ? project.links[0].url : null;
    if (!offerUrl) throw new Error('No offer URL found for the project.');

    const ssDir = path.join(__dirname, '../../reports/screenshots');
    if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

    let consoleIssues = { desktop: [], mobile: [] };
    let consoleCaptureDone = false;

    console.log('[Automation] Starting integrated automation flow...');

    // ── Phase 1: Mobile Console Check (as requested in previous logic) ──
    try {
        const mobileBrowser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito']
        });
        const mobileResults = await checkConsoleForViewport(
            mobileBrowser,
            offerUrl,
            project.id,
            'Mobile',
            puppeteer.KnownDevices['iPhone 12'].viewport,
            ssDir
        );
        consoleIssues.mobile = mobileResults;
        await mobileBrowser.close();
    } catch (err) {
        console.error('[Automation] Mobile console pass failed:', err.message);
    }

    for (const card of cards) {
        console.log(`[Automation] Processing card: ${card.card_number} and project url is ${offerUrl}`);

        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--incognito',
                '--start-maximized'
            ],
            defaultViewport: null
        });

        const context = await browser.createBrowserContext();
        const page = await context.newPage();

        // ── Stage 0: Setup Console Collector ──
        let collector = null;
        if (!consoleCaptureDone) {
            collector = await attachConsoleCollector(page);
        }

        await page.setViewport({ width: 1440, height: 900 });
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);

        try {
            // Helper for console snapshotting
            const takeConsoleSnapshot = async (pageName) => {
                if (!collector) return;
                const snapshot = collector.flush(pageName);
                if (snapshot.errors.length > 0 || snapshot.warnings.length > 0) {
                    const ts = Date.now();
                    const rawSS = path.join(ssDir, `console_raw_${project.id}_${pageName}_${ts}.png`);
                    try {
                        await page.screenshot({ path: rawSS, fullPage: true });
                    } catch (ssErr) {
                        console.log(`[Console Check] fullPage screenshot failed, using fallback: ${ssErr.message}`);
                        try { await page.screenshot({ path: rawSS }); } catch (e) { }
                    }

                    const compositeSS = path.join(ssDir, `console_${project.id}_${pageName}_${ts}.png`);
                    await createCompositeScreenshot(browser, rawSS, snapshot, compositeSS);
                    if (fs.existsSync(rawSS)) fs.unlinkSync(rawSS);
                    snapshot.screenshotPath = compositeSS;
                }
                consoleIssues.desktop.push(snapshot);
            };

            // 1. Navigate to Landing Page
            await page.goto(offerUrl, { waitUntil: 'load', timeout: 60000 });
            await new Promise(r => setTimeout(r, 4000));
            if (!consoleCaptureDone) await takeConsoleSnapshot('Landing Page');

            // 2. Fill Landing Page Fields (using original robust logic)
            const fields = {
                '#firstname1, input[name*="firstName"], #first_name': project.first_name,
                '#lastname1, input[name*="lastName"], #last_name': project.last_name,
                '#email1, input[name*="email"]': project.email,
                '#phone1, input[name*="phone"]': project.phone,
                '#shippingAddress1, input[name*="shippingAddress1"]': project.address,
                '#shippingCity1, input[name*="shippingCity"]': project.city,
                '#shippingState1, #shippingState, select[name*="shippingState"]': project.state,
                '#shippingZip1, input[name*="shippingZip"]': project.zip,
            };

            // for (const [selector, value] of Object.entries(fields)) {
            //     try {
            //         const element = await page.waitForSelector(selector, { timeout: 15000 });
            //         if (element) {
            //             if (selector.includes('select')) {
            //                 // Try to select by value or text
            //                 await page.select(selector, value).catch(() => { });
            //                 await page.evaluate((sel, val) => {
            //                     const select = document.querySelector(sel);
            //                     if (select) {
            //                         select.removeAttribute('readonly');
            //                         select.disabled = false;
            //                         const option = Array.from(select.options).find(o =>
            //                             o.value.toLowerCase().includes(val.toLowerCase()) ||
            //                             o.text.toLowerCase().includes(val.toLowerCase())
            //                         );
            //                         if (option) {
            //                             select.value = option.value;
            //                             select.dispatchEvent(new Event('input', { bubbles: true }));
            //                             select.dispatchEvent(new Event('change', { bubbles: true }));
            //                             select.dispatchEvent(new Event('blur', { bubbles: true }));
            //                         }
            //                     }
            //                 }, selector, value);
            //             } else {
            //                 await page.evaluate((sel, val) => {
            //                     const el = document.querySelector(sel);
            //                     if (el) {
            //                         el.removeAttribute('readonly');
            //                         el.disabled = false;
            //                         el.value = val;
            //                         el.dispatchEvent(new Event('input', { bubbles: true }));
            //                         el.dispatchEvent(new Event('change', { bubbles: true }));
            //                         el.dispatchEvent(new Event('blur', { bubbles: true }));
            //                     }
            //                 }, selector, value.toString());
            //             }
            //         }
            //     } catch (e) { }
            // }

            const landing_page_screenshot = path.join(ssDir, `landing_${project.id}_${card.card_number}_${Date.now()}.png`);
            await page.screenshot({ path: landing_page_screenshot, fullPage: true });

            // 3. Click Continue
            const continueSelectors = ['.form_sub', '#submitBtn', 'button.btn-custom', 'button[type="submit"]', 'input[type="submit"]', '#continue-btn'];
            let continued = false;
            for (const selector of continueSelectors) {
                try {
                    const btn = await page.$(selector);
                    if (btn) {
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 25000 }).catch(() => { }),
                            btn.click()
                        ]);
                        continued = true;
                        break;
                    }
                } catch (e) { }
            }

            if (!continued) {
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
                    const btn = btns.find(b => /continue|form_sub|submit/i.test(b.className + b.textContent + b.value));
                    if (btn) btn.click();
                });
                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 25000 }).catch(() => { });
            }

            await new Promise(r => setTimeout(r, 4000));
            if (!consoleCaptureDone) await takeConsoleSnapshot('Checkout Page');

            // 4. Fill Checkout Form (original robust logic)
            const paymentFields = {
                '#creditCardNumber, input[name*="creditCardNumber"]': card.card_number,
                '#cvv, input[name*="CVV"]': card.cvv,
                'select.expmonth, select[name="expmonth"], select[name*="month"]': card.card_month,
                'select.all-fields[name="expyear"], select[name="expyear"], select[name*="year"]': card.card_year,
            };

            for (const [selector, value] of Object.entries(paymentFields)) {
                try {
                    const element = await page.waitForSelector(selector, { timeout: 15000 });
                    if (element) {
                        let formattedValue = value.toString();
                        if (selector.includes('month')) formattedValue = formattedValue.padStart(2, '0');
                        else if (selector.includes('year')) formattedValue = formattedValue.slice(-2);

                        if (selector.includes('select')) {
                            await page.select(selector, formattedValue).catch(() => { });
                            await page.evaluate((sel, val) => {
                                const select = document.querySelector(sel);
                                if (select) {
                                    select.removeAttribute('readonly');
                                    select.disabled = false;
                                    const option = Array.from(select.options).find(o => o.value.includes(val) || o.text.includes(val));
                                    if (option) {
                                        select.value = option.value;
                                        select.dispatchEvent(new Event('input', { bubbles: true }));
                                        select.dispatchEvent(new Event('change', { bubbles: true }));
                                        select.dispatchEvent(new Event('blur', { bubbles: true }));
                                    }
                                }
                            }, selector, formattedValue);
                        } else {
                            // Inject all but the last character to avoid focus loss during long typing
                            const prefix = formattedValue.slice(0, -1);
                            const lastChar = formattedValue.slice(-1);

                            await page.evaluate((sel, val) => {
                                const input = document.querySelector(sel);
                                if (input) {
                                    input.removeAttribute('readonly');
                                    input.disabled = false;
                                    input.value = val;
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }, selector, prefix);

                            // Move cursor to the end and type the final character
                            await page.focus(selector);
                            await page.evaluate((sel) => {
                                const input = document.querySelector(sel);
                                if (input && typeof input.selectionStart !== 'undefined') {
                                    input.selectionStart = input.selectionEnd = input.value.length;
                                }
                            }, selector);
                            await page.keyboard.press(lastChar);

                            // Final events nudge
                            await page.evaluate((sel, val) => {
                                const input = document.querySelector(sel);
                                if (input) {
                                    input.value = val; // Ensure full value is set
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    input.dispatchEvent(new Event('change', { bubbles: true }));
                                    input.dispatchEvent(new KeyboardEvent('keyup', { key: val.slice(-1), code: 'Digit' + val.slice(-1), bubbles: true }));
                                    input.dispatchEvent(new Event('blur', { bubbles: true }));
                                }
                            }, selector, formattedValue);
                            await page.keyboard.press('Tab');
                        }
                    }
                } catch (e) { }
            }

            try {
                // Wait for any auto-detection scripts to finish
                await new Promise(r => setTimeout(r, 3000));

                const typeSel = '#creditCardType, select[name*="creditCardType"]';
                if (await page.$(typeSel)) {
                    // Only set if not already set by auto-detection
                    const currentType = await page.evaluate((sel) => {
                        const s = document.querySelector(sel);
                        return s ? s.value : null;
                    }, typeSel);

                    if (!currentType || currentType === '' || currentType.toLowerCase().includes('select')) {
                        console.log(`[Automation] Auto-detection failed or empty, manually setting card type to: ${card.card_type}`);
                        const cardTypeLower = (card.card_type || '').toLowerCase();

                        const optionValueToSelect = await page.evaluate((sel, cardType) => {
                            const select = document.querySelector(sel);
                            if (!select) return null;
                            const option = Array.from(select.options).find(o =>
                                o.value.toLowerCase().includes(cardType) ||
                                o.text.toLowerCase().includes(cardType) ||
                                (cardType.includes('master') && (o.text.toLowerCase().includes('master') || o.value.toLowerCase().includes('master')))
                            );
                            const fallback = Array.from(select.options).find(o => o.value !== '' && !o.text.toLowerCase().includes('select'));
                            const finalOption = option || fallback;
                            return finalOption ? finalOption.value : null;
                        }, typeSel, cardTypeLower);

                        if (optionValueToSelect) {
                            try {
                                await page.select(typeSel, optionValueToSelect);
                            } catch (e) { }

                            await page.evaluate((sel, valToSelect) => {
                                const select = document.querySelector(sel);
                                if (select) {
                                    select.value = valToSelect;
                                    select.dispatchEvent(new Event('input', { bubbles: true }));
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                    select.dispatchEvent(new Event('blur', { bubbles: true }));
                                }
                            }, typeSel, optionValueToSelect);

                            // Nudge the card number field to re-validate it after the card type was just set manually
                            await page.evaluate((cardNumberSel) => {
                                const el = document.querySelector(cardNumberSel);
                                if (el) {
                                    el.dispatchEvent(new Event('input', { bubbles: true }));
                                    el.dispatchEvent(new Event('change', { bubbles: true }));
                                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                                }
                            }, '#creditCardNumber, input[name*="creditCardNumber"]');
                        }
                    } else {
                        console.log(`[Automation] Card type already auto-selected: ${currentType}`);
                    }
                }
            } catch (e) { }

            // 5. Final Submit
            const submitButtons = ['#submitBtn', '.form_sub', '#submitBtnCheckout', '#submit-btn', 'button[type="submit"]', 'input[type="submit"].submit', '.checkout-button'];
            let submitted = false;
            await new Promise(resolve => setTimeout(resolve, 2000));

            for (const sel of submitButtons) {
                try {
                    const btn = await page.$(sel);
                    if (btn && await btn.isVisible()) {
                        console.log(`[Automation] Clicking submit button: ${sel}`);
                        await btn.click();
                        submitted = true;

                        // Handle potential popups more gracefully
                        try {
                            const noThanks = await page.waitForSelector('#nomaster, .close-modal, .no-thanks, #no-thanks, a[onclick*="close"]', { timeout: 5000 }).catch(() => null);
                            if (noThanks && await noThanks.isVisible()) {
                                console.log('[Automation] Modal/Popup detected, clicking close/no-thanks...');
                                await noThanks.click();
                                await new Promise(resolve => setTimeout(resolve, 3000));

                                // Re-check if we need to click submit again (sometimes popups intercept the first click)
                                const stillVisible = await page.evaluate((s) => {
                                    const b = document.querySelector(s);
                                    return b && b.offsetWidth > 0 && b.offsetHeight > 0;
                                }, sel);

                                if (stillVisible) {
                                    console.log('[Automation] Submit button still visible after popup, clicking again...');
                                    await page.click(sel);
                                }
                            }
                        } catch (popError) { }
                        break;
                    }
                } catch (e) { }
            }

            if (!submitted) {
                console.log('[Automation] Trying fallback submit click...');
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, .form_sub, #submitBtn'));
                    const btn = btns.find(b => /submit|place order|complete|checkout/i.test(b.innerText || b.value || b.textContent || b.id));
                    if (btn) {
                        btn.removeAttribute('readonly');
                        btn.disabled = false;
                        btn.scrollIntoView();
                        btn.click();
                    }
                });
            }

            // 6. Wait for Thank You page
            console.log('[Automation] Waiting for Thank You page redirect...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            let isThankYou = false;
            let finalUrl = page.url();
            for (let i = 0; i < 10; i++) {
                finalUrl = page.url();
                isThankYou = finalUrl.toLowerCase().includes('thank-you') ||
                    finalUrl.toLowerCase().includes('thankyou') ||
                    finalUrl.toLowerCase().includes('confirm') ||
                    finalUrl.toLowerCase().includes('success');
                if (isThankYou) break;
                const hasText = await page.evaluate(() => {
                    return document.body.innerText.toLowerCase().includes('thank you') ||
                        document.body.innerText.toLowerCase().includes('order confirmed');
                }).catch(() => false);
                if (hasText) { isThankYou = true; break; }
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Stabilization wait for Thank You page console issues
            if (isThankYou) {
                console.log('[Automation] Thank You page detected, waiting 3s for final scripts/pixels...');
                await new Promise(r => setTimeout(r, 3000));
            }

            if (!consoleCaptureDone) await takeConsoleSnapshot('Thank You Page');

            let errorMsg = null;
            if (!isThankYou && finalUrl.includes('checkout')) {
                errorMsg = await page.evaluate(() => {
                    const eb = document.querySelector('.error, .alert-danger, #error-message, .validation-summary-errors, .message-error, .err-msg, .error-msg, .alert-error');
                    if (eb && eb.innerText.trim() !== '') return eb.innerText.trim();
                    // Fallback to check for common error text
                    const bodyText = document.body.innerText.toLowerCase();
                    if (bodyText.includes('decline') || bodyText.includes('failed') || bodyText.includes('invalid')) {
                        return "Order declined/failed visible on page.";
                    }
                    return "Stuck on checkout page.";
                });
                console.log(`[Automation] Order might have failed: ${errorMsg}`);
            }

            const screenshotPath = path.join(ssDir, `final_${project.id}_${card.card_number}_${Date.now()}.png`);
            try {
                await page.screenshot({ path: screenshotPath, fullPage: true });
            } catch (ssErr) {
                try { await page.screenshot({ path: screenshotPath }); } catch (e) { }
            }

            results.push({
                card_number: card.card_number,
                url: finalUrl,
                landing_page_screenshot: landing_page_screenshot,
                screenshot: screenshotPath,
                error: errorMsg
            });

            if (!consoleCaptureDone) consoleCaptureDone = true;

        } catch (err) {
            console.error(`[Automation] Critical error: ${err.message}`);
            const errSS = path.join(ssDir, `error_${project.id}_${card.card_number}_${Date.now()}.png`);
            try { await page.screenshot({ path: errSS, fullPage: true }); } catch (sE) { }
            results.push({ card_number: card.card_number, error: err.message, error_screenshot: errSS, url: page.url() });
        } finally {
            await browser.close();
        }
    }

    if (results.length > 0) results[0].consoleIssues = consoleIssues;
    else results.push({ consoleIssues });

    return results;
}

module.exports = { runAutomation };

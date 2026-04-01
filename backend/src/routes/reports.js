const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { generateTestReport } = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

// GET /api/reports/download/:projectId
router.get('/download/:projectId', authMiddleware, async (req, res) => {
    try {
        const [projects] = await db.execute('SELECT id, project_name FROM projects WHERE id = ?', [req.params.projectId]);
        if (projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const project = projects[0];

        // Fetch First URL from project_links to use as the offer link for the test report
        const [links] = await db.execute('SELECT url FROM project_links WHERE project_id = ? ORDER BY id ASC LIMIT 1', [project.id]);

        // If there is no link, fallback to a dummy link so report still generates
        const offerUrl = links.length > 0 ? links[0].url : 'https://example.com/missing-url';

        // Check if report already exists in temp dir to avoid regenerating immediately (basic caching)
        // In a real app we'd regenerate on request or have a specific "Generate New" button
        const reportPath = path.join(__dirname, `../../reports/${project.id}_report.pdf`);

        // Fetch automation results from DB to include in the PDF
        const [reports] = await db.execute('SELECT screenshots_json FROM test_reports WHERE project_id = ? ORDER BY created_at DESC LIMIT 1', [project.id]);
        const automationResults = reports.length > 0 ? reports[0].screenshots_json : null;

        let finalPath = reportPath;
        // Always regenerate if the user just ran automation, or if file doesn't exist
        // For now, let's keep the caching but check if we have results to include
        if (!fs.existsSync(reportPath) || automationResults) {
            // Generate the report via puppeteer
            finalPath = await generateTestReport({
                projectId: project.id,
                projectName: project.project_name,
                offerUrl: offerUrl,
                automationResults: automationResults // Pass the results here
            });
        }

        // Send the PDF file to the client for download
        res.download(finalPath, `${project.project_name.replace(/\\s+/g, '_')}_Test_Report.pdf`, (err) => {
            if (err) {
                console.error('[API] Download error:', err);
                if (!res.headersSent) res.status(500).json({ error: 'Error downloading file' });
            }
        });

    } catch (error) {
        console.error('[API] Error in report generation router:', error);
        res.status(500).json({ error: 'Internal server error while generating report' });
    }
});

module.exports = router;

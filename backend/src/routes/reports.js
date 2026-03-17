const express = require('require');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/adminAuth');
const { generateTestReport } = require('../utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

// GET /api/reports/download/:projectId
// Generate (or return cached) PDF report for a project and stream it as an attachment
router.get('/download/:projectId', requireAuth, async (req, res) => {
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
        
        let finalPath = reportPath;
        if (!fs.existsSync(reportPath)) {
             // Generate the report via puppeteer
             finalPath = await generateTestReport({
                 projectId: project.id,
                 projectName: project.project_name,
                 offerUrl: offerUrl
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

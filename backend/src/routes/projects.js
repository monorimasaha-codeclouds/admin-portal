const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { runAutomation } = require('../utils/automation');
const { generateTestReport } = require('../utils/pdfGenerator');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

const REQUIRED_FIELDS = [
  'project_name', 'first_name', 'last_name',
  'email', 'phone', 'address', 'city', 'zip', 'state'
];

// POST /api/projects — Create a new project
router.post('/', async (req, res) => {
  let connection;
  try {
    // Validate all required fields
    const missing = REQUIRED_FIELDS.filter(field => !req.body[field] || req.body[field].toString().trim() === '');
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields.',
        missing_fields: missing,
      });
    }

    const {
      project_name, first_name, last_name,
      email, phone, address, city, zip, state,
      links, cards
    } = req.body;

    // Validate arrays
    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ error: 'At least one project link is required.' });
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'At least one test card is required.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert Project
    const [result] = await connection.query(
      `INSERT INTO projects 
       (user_id, project_name, first_name, last_name, email, phone, address, city, zip, state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, project_name, first_name, last_name, email, phone, address, city, zip, state]
    );

    const projectId = result.insertId;

    // 2. Insert Links
    for (const link of links) {
      if (!link.link_type || !link.url) {
        throw new Error('Link type and URL are required for all links.');
      }
      await connection.query(
        'INSERT INTO project_links (project_id, link_type, url) VALUES (?, ?, ?)',
        [projectId, link.link_type, link.url]
      );
    }

    // 3. Insert Cards
    for (const card of cards) {
      if (!card.card_number || !card.card_type || !card.category || !card.card_month || !card.card_year || !card.cvv) {
        throw new Error('Incomplete card data provided.');
      }
      await connection.query(
        'INSERT INTO project_cards (project_id, card_number, card_type, category, card_month, card_year, cvv) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [projectId, card.card_number, card.card_type, card.category, card.card_month, card.card_year, card.cvv]
      );
    }

    await connection.commit();
    connection.release();

    res.status(201).json({
      message: 'Project created successfully.',
      project: { id: projectId, project_name, status: 'pending' },
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Create project error:', err);
    res.status(err.message.includes('required') || err.message.includes('Incomplete') ? 400 : 500).json({ 
      error: err.message || 'Internal server error.' 
    });
  }
});

// GET /api/projects — List all projects for the authenticated user
router.get('/', async (req, res) => {
  try {
    const [projects] = await pool.query(
      'SELECT id, project_name, first_name, last_name, email, status, created_at FROM projects WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/projects/:id — Get single project details with links and cards
router.get('/:id', async (req, res) => {
  try {
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const project = projects[0];

    // Fetch Links
    const [links] = await pool.query(
      'SELECT * FROM project_links WHERE project_id = ?',
      [project.id]
    );

    // Fetch Cards
    const [cards] = await pool.query(
      'SELECT * FROM project_cards WHERE project_id = ?',
      [project.id]
    );

    project.links = links;
    project.cards = cards;

    res.json({ project });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/projects/:id — Delete a project (CASCADE automatically deletes links/cards)
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// POST /api/projects/:id/run — Trigger automation for a project
router.post('/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Fetch project with links and cards
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const project = projects[0];

    // Fetch Links
    const [links] = await pool.query(
      'SELECT * FROM project_links WHERE project_id = ?',
      [id]
    );

    // Fetch Cards
    const [cards] = await pool.query(
      'SELECT * FROM project_cards WHERE project_id = ?',
      [id]
    );

    project.links = links;
    project.cards = cards;

    if (links.length === 0) {
      return res.status(400).json({ error: 'Project has no URLs to test.' });
    }

    // 2. Update status to 'testing'
    await pool.query('UPDATE projects SET status = "testing" WHERE id = ?', [id]);

    // 3. Run Automation (In background or wait?)
    // For simplicity in this demo, we wait, but in production this should be a job

    // Respond early to avoid timeout if it takes too long
    // But for this task, the user wants to see the result, so we might wait a bit or use a separate status check.
    // However, let's process it and let the frontend poll or wait.
    
    try {
        const automationResults = await runAutomation(project, cards);
        
        // 4. Generate Report
        const offerUrl = links[0].url;
        await generateTestReport({
            projectId: id,
            projectName: project.project_name,
            offerUrl: offerUrl,
            automationResults: automationResults
        });

        // 5. Update status to 'completed'
        await pool.query('UPDATE projects SET status = "completed" WHERE id = ?', [id]);

        res.json({ message: 'Automation completed successfully.', results: automationResults });
    } catch (runError) {
        console.error('Automation run error:', runError);
        await pool.query('UPDATE projects SET status = "failed" WHERE id = ?', [id]);
        res.status(500).json({ error: 'Automation failed: ' + runError.message });
    }

  } catch (err) {
    console.error('Run project error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

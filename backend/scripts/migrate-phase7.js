const pool = require('../src/config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function migrate() {
  try {
    console.log('Running Phase 7 Migration...');

    // 1. Create project_links
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        link_type VARCHAR(255) NOT NULL,
        url VARCHAR(512) NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 2. Create project_cards
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        card_number VARCHAR(50) NOT NULL,
        card_type VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        card_month VARCHAR(2) NOT NULL,
        card_year VARCHAR(4) NOT NULL,
        cvv VARCHAR(4) NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 3. Drop single scalar columns from projects (use try/catch to ignore if already dropped)
    const columnsToDrop = ['project_url', 'credit_card_number', 'card_month', 'card_year', 'cvv'];
    
    for (const col of columnsToDrop) {
      try {
        await pool.query(`ALTER TABLE projects DROP COLUMN ${col}`);
        console.log(`Dropped column ${col}`);
      } catch (e) {
        if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
           console.log(`Column ${col} already dropped, skipping.`);
        } else {
           throw e;
        }
      }
    }

    console.log('Phase 7 Migration successful.');
    process.exit(0);
  } catch(err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();

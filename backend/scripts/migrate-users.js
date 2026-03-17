const pool = require('../src/config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function migrate() {
  try {
    console.log('Running Migration...');
    await pool.query("ALTER TABLE users ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user'");
    await pool.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active'");
    await pool.query("UPDATE users SET role='admin' WHERE id = 1");
    console.log('Migration successful.');
    process.exit(0);
  } catch(err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
      process.exit(0);
    } else {
      console.error(err);
      process.exit(1);
    }
  }
}

migrate();

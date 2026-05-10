const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function setupDatabase() {
  try {
    console.log('📖 Reading schema.sql...');
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove the CREATE DATABASE and USE commands as they might cause issues with pre-allocated Aiven databases
    schema = schema.replace(/CREATE DATABASE IF NOT EXISTS admin_portal;/g, '');
    schema = schema.replace(/USE admin_portal;/g, '');

    // Split by semicolon to execute one by one
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');

    console.log('🚀 Executing SQL statements...');
    for (let statement of statements) {
      await pool.query(statement);
    }

    console.log('✅ Database setup complete! All tables created.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up database:', err);
    process.exit(1);
  }
}

setupDatabase();

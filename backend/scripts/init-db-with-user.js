const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function init() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  console.log('Connecting to MySQL...');
  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    console.error('Could not connect to MySQL. Is the server running?');
    console.error(err.message);
    process.exit(1);
  }

  try {
    console.log('Creating database if not exists...');
    await connection.query('CREATE DATABASE IF NOT EXISTS admin_portal');
    await connection.query('USE admin_portal');

    console.log('Checking/Creating tables...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
    // Split by semicolon and filter out empty strings
    const commands = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

    for (const cmd of commands) {
      if (!cmd.toUpperCase().startsWith('CREATE DATABASE') && !cmd.toUpperCase().startsWith('USE')) {
        await connection.query(cmd);
      }
    }

    console.log('Adding default user...');
    const name = 'Monorima Saha';
    const email = 'monorima.saha@codeclouds.co.in';
    const password = '123456';

    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('User already exists. Skipping...');
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      await connection.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, passwordHash, 'admin']
      );
      console.log('Default user added successfully!');
    }

    console.log('Setup complete!');
  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    await connection.end();
  }
}

init();

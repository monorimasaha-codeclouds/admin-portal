const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://admin-portal-u1gq.vercel.app',
    'https://admin-portal-gold-omega.vercel.app',
    'https://sql301.infinityfree.com',
    'sql301.infinityfree.com',
    'https://dash.infinityfree.com',
    'dash.infinityfree.com',
    'database-dev.free.nf',
    'https://database-dev.free.nf'
  ],
  credentials: true,
}));
app.use(express.json());

// DEBUG ENDPOINT - Visit this in your browser to check Vercel status
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  try {
    const automationPath = path.join(__dirname, 'utils/automation.js');
    const automationCode = fs.existsSync(automationPath) 
      ? fs.readFileSync(automationPath, 'utf8').substring(0, 500)
      : 'File not found at ' + automationPath;
    res.json({
      message: "Debug Info",
      hasToken: !!process.env.BROWSERLESS_TOKEN,
      isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
      codeSnippet: automationCode
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

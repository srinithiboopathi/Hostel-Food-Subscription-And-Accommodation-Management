const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { checkDatabaseConnection, closePool } = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security & CORS configuration
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security Headers Middleware (OWASP recommended)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 2. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. API Routes mounting
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    project: 'Hostel Food & Accommodation Management API',
    status: 'Running',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// 4. Unknown route (404) and Central Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

// 5. Server Initialization
let server;

async function startServer() {
  // Test MySQL connection at startup
  const dbHealth = await checkDatabaseConnection();
  if (dbHealth.connected) {
    console.log(`[Database] Connected successfully to MySQL database: '${dbHealth.database}' (MySQL v${dbHealth.version})`);
  } else {
    console.warn(`[Database Warning] Could not connect to MySQL database: ${dbHealth.error}`);
    console.warn('[Database Warning] Verify your MySQL server and credentials in backend/.env');
  }

  server = app.listen(PORT, () => {
    console.log('====================================================');
    console.log(` 🚀 Hostel Management API Backend Server Running`);
    console.log(` 📡 Base URL: http://localhost:${PORT}`);
    console.log(` 🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(` 🗄️ Database Check: http://localhost:${PORT}/api/health/database`);
    console.log(` 🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================================');
  });
}

// 6. Graceful Shutdown handlers
function handleGracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await closePool();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = app;

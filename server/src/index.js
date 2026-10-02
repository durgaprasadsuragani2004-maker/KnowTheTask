const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityRoutes = require('./routes/activityRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const swaggerSpec = require('./docs/swaggerDoc');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      // Allow localhost dev servers or specific CLIENT_URL
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin === CLIENT_URL) {
        return callback(null, true);
      }
      return callback(null, true); // Dev friendly
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma'],
  })
);

// Disable ETags to ensure live PostgreSQL database is always the source of truth
app.set('etag', false);

// 2. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Anti-caching middleware for all dynamic API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// 3. Request logger in dev
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 4. Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'KnowTheTask API',
    tagline: 'Project & Team Management Platform',
    timestamp: new Date().toISOString(),
  });
});

// 5. API Documentation (Part 8)
app.get('/api/docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/api/docs', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KnowTheTask — REST API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafbfc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .topbar { display: none !important; }
      .swagger-ui .info .title { color: #0f172a; font-size: 28px; }
      .swagger-ui .opblock.opblock-post { border-color: #059669; background: rgba(5,150,105,.05); }
      .swagger-ui .opblock.opblock-get { border-color: #2563eb; background: rgba(37,99,235,.05); }
      .swagger-ui .opblock.opblock-put { border-color: #d97706; background: rgba(217,119,6,.05); }
      .swagger-ui .opblock.opblock-patch { border-color: #7c3aed; background: rgba(124,58,237,.05); }
      .swagger-ui .opblock.opblock-delete { border-color: #e11d48; background: rgba(225,29,72,.05); }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: '/api/docs/swagger.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout"
        });
      };
    </script>
  </body>
</html>
  `);
});

// 6. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/analytics', analyticsRoutes);


// 6. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// 7. Centralized Error Handler
app.use(errorHandler);

// 8. Start server after PostgreSQL connection
async function startServer() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 KnowTheTask Backend Server running on port ${PORT}`);
      console.log(`📡 Base URL: http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => console.log('HTTP server closed'));
    });
  } catch (error) {
    console.error('Failed to start KnowTheTask server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;

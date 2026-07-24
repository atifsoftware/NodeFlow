const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust the reverse proxy to get correct client IP for rate limiting

// Enable CORS for external API clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(compression()); // Compress responses with Gzip

const PORT = process.env.PORT || 3000;

// Initialize global RequestContext middleware (VERY FIRST HOOK)
const requestContext = require('./app/core/RequestContext');
app.use((req, res, next) => {
  requestContext.run({ req, res }, next);
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Load Global Helpers (PHP-like global functions)
require('./app/core/helpers');

// Initialize Session File Store directory setup
const sessionStore = new FileStore({
  path: path.join(__dirname, 'sessions'),
  ttl: 86400, // 1 day
  logFn: () => { } // Suppress console logs on session files creation
});

// Configure EJS view engine
app.set('views', path.join(__dirname, 'app', 'views'));
app.set('view engine', 'ejs');

// Standard middlewares & Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false // Allows Bootstrap/FontAwesome/CDN fonts to load smoothly
}));

// Global Rate Limiter (Anti-DDoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests. Please try again after 15 minutes.' }
});
app.use(globalLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
}));
app.use(fileUpload());

// Set up express-session with FileStore
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'nodeflow_default_secret_key_123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: false // Set to true if running on HTTPS
  }
}));

// Import global middlewares
const { shareUser } = require('./app/middlewares/auth');
app.use(shareUser);

// Mount flash session middleware
const flashMiddleware = require('./app/middlewares/flashMiddleware');
app.use(flashMiddleware);

// Register Custom CSRF Security guard (after session parser)
const csrf = require('./app/middlewares/csrf');
app.use(csrf);

// Load Site Settings and make them globally accessible in all EJS views (In-Memory Cached)
const DB = require('./config/db');
let settingsCache = null;

async function reloadSettingsCache() {
  try {
    const tables = await DB.query("SHOW TABLES LIKE 'settings'");
    let settingsMap = {
      name: 'NodeFlow Framework',
      short_name: 'NodeFlow',
      logo: '',
      favicon: ''
    };
    
    if (tables.length > 0) {
      const rows = await DB.table('settings').get();
      rows.forEach(row => {
        settingsMap[row.setting_key] = row.setting_value;
      });
    }
    settingsCache = settingsMap;
    global.cachedSettingsMap = settingsCache;
  } catch (err) {
    console.error('Failed to reload settings cache:', err);
    if (!settingsCache) {
      settingsCache = {
        name: 'NodeFlow Framework',
        short_name: 'NodeFlow',
        logo: '',
        favicon: ''
      };
      global.cachedSettingsMap = settingsCache;
    }
  }
}

// Register global cache-invalidation trigger
global.flushSettingsCache = async () => {
  await reloadSettingsCache();
};

app.use(async (req, res, next) => {
  try {
    if (!settingsCache) {
      await reloadSettingsCache();
    }
    res.locals.settingsMap = settingsCache;
    next();
  } catch (err) {
    next(err);
  }
});

// Load web and API routes
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

// Load Swagger API Documentation
const { swaggerUi, swaggerSpec } = require('./config/swagger');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/', webRoutes);
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('errors/404', { title: '404 - Page Not Found', layout: false });
});

// 500 server error handler (Intelligent Error Suggestion system)
app.use(require('./app/middlewares/errorHandler'));

// Start the server
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.io WebSockets broadcast layer
const Socket = require('./app/core/Socket');
Socket.init(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================`);
  console.log(`🚀 NodeFlow Server is running at http://0.0.0.0:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`================================================`);
});

module.exports = app;

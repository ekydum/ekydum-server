var express = require('express');
var cors = require('cors');
var redis = require('./config/redis');
var sequelize = require('./config/database');
var errorHandler = require('./middleware/error-handler');
var pkg = require('../package.json');
var adminRoutes = require('./routes/admin');
var channelsRoutes = require('./routes/channels');
var subscriptionsRoutes = require('./routes/subscriptions');
var settingsRoutes = require('./routes/settings');
var videosRoutes = require('./routes/videos');
var meRoutes = require('./routes/me');

var app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['content-type', 'x-admin-token', 'x-account-token'],
  credentials: true,
  maxAge: 86400,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async function (req, res) {
  res.json({
    server: pkg.name,
    version: pkg.version,
    description: pkg.description,
    ts: new Date().getTime(),
  });
});

// Health check
app.get('/health', async function(req, res) {
  var health = {
    status: 'ok',
    db: 'ok',
    cache: 'ok',
    ts: new Date().getTime(),
  };

  try {
    await sequelize.authenticate();
  } catch (error) {
    health.db = 'error';
    health.status = 'error';
  }

  try {
    await redis.ping();
  } catch (error) {
    health.cache = 'error';
    health.status = 'error';
  }

  var statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Routes
app.use('/admin', adminRoutes);
app.use('/channels', channelsRoutes);
app.use('/subscriptions', subscriptionsRoutes);
app.use('/settings', settingsRoutes);
app.use('/videos', videosRoutes);
app.use('/me', meRoutes);

// 404 handler
app.use(function(req, res) {
  res.status(404).json({ error: 'NOT_FOUND' });
});

// Error handler
app.use(errorHandler);

module.exports = app;

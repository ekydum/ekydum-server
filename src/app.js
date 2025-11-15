var express = require('express');
var cors = require('cors');
var errorHandler = require('./middleware/error-handler');
var pkg = require('../package.json');
var systemController = require('./controllers/system-controller');
var adminRoutes = require('./routes/admin');
var channelsRoutes = require('./routes/channels');
var subscriptionsRoutes = require('./routes/subscriptions');
var settingsRoutes = require('./routes/settings');
var videosRoutes = require('./routes/videos');
var meRoutes = require('./routes/me');
var hlsRoutes = require('./routes/hls');
var searchRoutes = require('./routes/search');
var playlistsRoutes = require('./routes/playlists');
var starredRoutes = require('./routes/starred');

var app = express();

var corsOrigins = (process.env.CORS_ORIGIN || '').split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0);
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
  allowedHeaders: ['content-type', 'x-admin-token', 'x-account-token', 'range'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Content-Type'],
  credentials: true,
  maxAge: 86400,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.disable('x-powered-by');
var SERVER_NAME = 'ekydum/' + pkg.version;
app.use(function (req, res, next) {
  res.setHeader('Backend', SERVER_NAME);
  next();
});

app.get('/', systemController.getServerInfo());
app.get('/health', systemController.getHealth());

// Routes
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/channels', channelsRoutes);
app.use('/playlists', playlistsRoutes);
app.use('/subscriptions', subscriptionsRoutes);
app.use('/settings', settingsRoutes);
app.use('/videos', videosRoutes);
app.use('/me', meRoutes);
app.use('/hls', hlsRoutes);
app.use('/starred', starredRoutes);

// 404 handler
app.use(systemController.err404());

// Error handler
app.use(errorHandler);

module.exports = app;

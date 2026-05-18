require('dotenv').config();
var app = require('./app');
var { syncDatabase } = require('./models');

var PORT = process.env.PORT || 3000;
var server = null;

// Validate ADMIN_TOKEN
if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 128) {
  console.error('ERROR: ADMIN_TOKEN must be at least 128 characters long');
  process.exit(1);
}

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log('\n' + signal + ' received, shutting down gracefully...');

  if (server) {
    server.close(function () {
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(function () {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Start server
async function startServer() {
  try {
    // Sync database
    await syncDatabase();

    // Start listening
    server = app.listen(PORT, function() {
      console.log('Server is running on port ' + PORT);
      console.log('Environment: ' + process.env.NODE_ENV);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', function () { gracefulShutdown('SIGTERM'); });
process.on('SIGINT', function () { gracefulShutdown('SIGINT'); });

startServer();

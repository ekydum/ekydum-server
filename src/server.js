require('dotenv').config();
var app = require('./app');
var { syncDatabase } = require('./models');

var PORT = process.env.PORT || 3000;

// Validate ADMIN_TOKEN
if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 128) {
  console.error('ERROR: ADMIN_TOKEN must be at least 128 characters long');
  process.exit(1);
}

// Start server
async function startServer() {
  try {
    // Sync database
    await syncDatabase();
    
    // Start listening
    app.listen(PORT, function() {
      console.log('Server is running on port ' + PORT);
      console.log('Environment: ' + process.env.NODE_ENV);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

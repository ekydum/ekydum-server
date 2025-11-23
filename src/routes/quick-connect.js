var express = require('express');
var router = express.Router();
var QuickConnectController = require('../controllers/quick-connect-controller');

// Quick connect endpoint
router.post('/', QuickConnectController.quickConnect);

module.exports = router;

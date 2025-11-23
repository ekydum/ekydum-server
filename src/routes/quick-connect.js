var express = require('express');
var router = express.Router();
var QuickConnectController = require('../controllers/quick-connect-controller');

// Quick connect endpoint (create new account)
router.post('/', QuickConnectController.quickConnect);

// Login request endpoints (existing account)
router.post('/login-request', QuickConnectController.createLoginRequest);
router.get('/login-request/:request_id/status', QuickConnectController.getLoginRequestStatus);

module.exports = router;

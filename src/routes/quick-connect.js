var express = require('express');
var router = express.Router();
var QuickConnectController = require('../controllers/quick-connect-controller');

router.post('/', QuickConnectController.quickConnect());
router.post('/login-request', QuickConnectController.createLoginRequest());
router.get('/login-request/:request_id/status', QuickConnectController.getLoginRequestStatus());

module.exports = router;

var express = require('express');
var router = express.Router();
var AdminController = require('../controllers/admin-controller');
var { requireAdminToken } = require('../middleware/auth');

// All admin routes require admin token
router.use(requireAdminToken);

// Account management
router.post('/accounts', AdminController.createAccount());
router.get('/accounts', AdminController.getAllAccounts());
router.get('/accounts/:id', AdminController.getAccountById());
router.put('/accounts/:id', AdminController.updateAccount());
router.delete('/accounts/:id', AdminController.deleteAccount());

// Account status management
router.post('/accounts/:id/approve', AdminController.approveAccount());
router.post('/accounts/:id/block', AdminController.blockAccount());

// Login requests management
router.get('/login-requests', AdminController.getAllLoginRequests());
router.post('/login-requests/:request_id/approve', AdminController.approveLoginRequest());
router.post('/login-requests/:request_id/deny', AdminController.denyLoginRequest());

module.exports = router;

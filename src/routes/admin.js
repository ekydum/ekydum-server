var express = require('express');
var router = express.Router();
var AdminController = require('../controllers/admin-controller');
var { requireAdminToken } = require('../middleware/auth');

// All admin routes require admin token
router.use(requireAdminToken);

// Account management
router.post('/accounts', AdminController.createAccount);
router.get('/accounts', AdminController.getAllAccounts);
router.get('/accounts/:id', AdminController.getAccountById);
router.put('/accounts/:id', AdminController.updateAccount);
router.delete('/accounts/:id', AdminController.deleteAccount);

// Account status management
router.post('/accounts/:id/approve', AdminController.approveAccount);
router.post('/accounts/:id/block', AdminController.blockAccount);

module.exports = router;

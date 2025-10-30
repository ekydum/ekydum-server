var express = require('express');
var router = express.Router();
var { requireAccountToken } = require('../middleware/auth');

// Get current account info
router.get('/', requireAccountToken, function(req, res) {
  res.json({
    id: req.account.id,
    name: req.account.name,
    created_at: req.account.created_at,
    updated_at: req.account.updated_at
  });
});

module.exports = router;

var express = require('express');
var router = express.Router();
var { requireAccountToken } = require('../middleware/auth');

router.get('/', requireAccountToken(true), function(req, res) {
  res.json({
    id: req.account.id,
    name: req.account.name,
    status: req.account.status,
    created_at: req.account.created_at,
    updated_at: req.account.updated_at
  });
});

module.exports = router;

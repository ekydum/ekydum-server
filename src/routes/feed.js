var express = require('express');
var router = express.Router();
var FeedController = require('../controllers/feed-controller');

var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken());

router.get('/', FeedController.getFeed());

module.exports = router;

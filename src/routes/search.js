var express = require('express');
var router = express.Router();
var SearchController = require('../controllers/search-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken);

router.post('/videos', SearchController.searchVideos());

module.exports = router;

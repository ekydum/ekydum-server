var express = require('express');
var router = express.Router();
var VideosController = require('../controllers/videos-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken);

router.get('/:yt_video_id', VideosController.getVideoInfo);

module.exports = router;

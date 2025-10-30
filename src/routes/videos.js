var express = require('express');
var router = express.Router();
var VideosController = require('../controllers/videos-controller');
var { requireAccountToken } = require('../middleware/auth');

// All video routes require account token
router.use(requireAccountToken);

router.get('/:yt_video_id', VideosController.getVideoInfo);
router.get('/:yt_video_id/stream', VideosController.getVideoStream);

module.exports = router;

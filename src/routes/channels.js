var express = require('express');
var router = express.Router();
var ChannelsController = require('../controllers/channels-controller');
var { requireAccountToken } = require('../middleware/auth');

// All channel routes require account token
router.use(requireAccountToken);

router.post('/search', ChannelsController.searchChannels);
router.get('/:yt_channel_id', ChannelsController.getChannelInfo);
router.get('/:yt_channel_id/videos', ChannelsController.getChannelVideos);

module.exports = router;

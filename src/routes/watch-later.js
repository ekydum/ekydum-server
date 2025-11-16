var express = require('express');
var router = express.Router();
var WatchLaterController = require('../controllers/watch-later-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken);

router.get('/', WatchLaterController.getWatchLater);
router.post('/', WatchLaterController.addWatchLater);
router.delete('/:yt_video_id', WatchLaterController.removeWatchLater);
router.get('/check/:yt_video_id', WatchLaterController.checkWatchLater);

module.exports = router;

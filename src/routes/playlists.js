var express = require('express');
var router = express.Router();
var PlaylistsController = require('../controllers/playlists-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken);

router.get('/:yt_playlist_id/videos', PlaylistsController.getPlaylistVideos);

module.exports = router;

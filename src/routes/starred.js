var express = require('express');
var router = express.Router();
var StarredController = require('../controllers/starred-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken);

router.get('/starred', StarredController.getStarred);
router.post('/starred', StarredController.addStarred);
router.delete('/starred/:yt_video_id', StarredController.removeStarred);
router.get('/starred/:yt_video_id', StarredController.checkStarred);

module.exports = router;

var YtdlpService = require('../services/ytdlp-service');

var VideosController = {
  getVideoInfo: async function(req, res, next) {
    try {
      var ytVideoId = req.params.yt_video_id;
      var videoInfo = await YtdlpService.getVideoInfo(ytVideoId);

      res.json(videoInfo);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = VideosController;

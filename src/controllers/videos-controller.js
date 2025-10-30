var YtdlpService = require('../services/ytdlp-service');
var { Setting } = require('../models');

var VideosController = {
  // Get video info
  getVideoInfo: async function(req, res, next) {
    try {
      var ytVideoId = req.params.yt_video_id;
      var videoInfo = await YtdlpService.getVideoInfo(ytVideoId);
      
      res.json(videoInfo);
    } catch (err) {
      next(err);
    }
  },

  // Get video stream URL
  getVideoStream: async function(req, res, next) {
    try {
      var ytVideoId = req.params.yt_video_id;
      
      // Get quality from user settings or use default
      var qualitySetting = await Setting.findOne({
        where: {
          account_id: req.account.id,
          key: 'DEFAULT_QUALITY'
        }
      });
      
      var quality = qualitySetting ? qualitySetting.value : '720p';
      
      // Allow override from query parameter
      if (req.query.quality && YtdlpService.QUALITY_MAP[req.query.quality]) {
        quality = req.query.quality;
      }
      
      var streamInfo = await YtdlpService.getVideoStreamUrl(ytVideoId, quality);
      
      res.json(streamInfo);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = VideosController;

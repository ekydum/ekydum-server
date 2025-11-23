var YtdlpService = require('../services/ytdlp-service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');

var VideosController = {
  getVideoInfo: function () {
    return async function(req, res, next) {
      try {
        var ytVideoId = req.params.yt_video_id;
        var accountId = req.account.id;
        var token = req.account.token;

        var [videoInfo, settings] = await Promise.all([
          YtdlpService.getVideoInfo(ytVideoId, accountId),
          ClientSettingsHelper.getSettings(accountId)
        ]);

        var shouldProxyThumbnails = +settings.RELAY_PROXY_THUMBNAILS === 1;
        if (shouldProxyThumbnails && videoInfo?.thumbnail) {
          videoInfo.thumbnail = ProxyHelper.wrapUrl(ProxyHelper.ENDPOINT_IMG, req, videoInfo.thumbnail, token);
        }

        res.json(videoInfo);
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = VideosController;

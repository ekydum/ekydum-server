var Joi = require('joi');
var YtdlpService = require('../services/yt-service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');

var SearchController = {
  _schemaSearchVideos: Joi.object({
    q: Joi.string().required().min(1),
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(50).default(20)
  }),

  searchVideos: function () {
    return async function(req, res, next) {
      try {
        var accountId = req.account.id;
        var token = req.account.token;

        var { error, value } = SearchController._schemaSearchVideos.validate(req.body);
        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var [videos, settings] = await Promise.all([
            YtdlpService.searchVideos(value.q, value.offset, value.limit, accountId),
            ClientSettingsHelper.getSettings(accountId)
          ]);

          var shouldProxyThumbnails = +settings.RELAY_PROXY_THUMBNAILS === 1;
          if (shouldProxyThumbnails && Array.isArray(videos)) {
            videos.forEach(function (videoRef) {
              ProxyHelper.wrapObjectThumbnail(req, videoRef, token);
            });
          }

          res.json({ videos: videos });
        }
      } catch (err) {
        next(err);
      }
    };
  }
};

module.exports = SearchController;

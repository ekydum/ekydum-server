var Joi = require('joi');
var YtdlpService = require('../services/yt-service');
var VideoEnrichmentService = require('../services/video-enrichment.service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');
var { GLOBAL_PAGE_SIZE } = require('../config/constants');

var SearchController = {
  _schemaSearchVideos: Joi.object({
    q: Joi.string().required().min(1),
    offset: Joi.number().integer().min(0).default(0)
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
            YtdlpService.searchVideos(value.q, value.offset, GLOBAL_PAGE_SIZE, accountId),
            ClientSettingsHelper.getSettings(accountId)
          ]);

          // Enrich with watch later / starred flags
          videos = await VideoEnrichmentService.enrichVideos(videos, accountId);

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

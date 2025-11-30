var Joi = require('joi');
var FeedService = require('../services/feed-service');
var VideoEnrichmentService = require('../services/video-enrichment.service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');
var { GLOBAL_PAGE_SIZE } = require('../config/constants');

var FeedController = {
  _schemaGetFeed: Joi.object({
    page: Joi.number().integer().min(1).default(1)
  }),

  getFeed: function () {
    return async function (req, res, next) {
      try {
        var accountId = req.account.id;
        var token = req.account.token;
        var page = parseInt(req.query.page) || 1;

        var { error, value } = FeedController._schemaGetFeed.validate({
          page: page
        });

        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var [result, settings] = await Promise.all([
            FeedService.getFeed(accountId, value.page, GLOBAL_PAGE_SIZE),
            ClientSettingsHelper.getSettings(accountId),
          ]);

          // Enrich with watch later / starred flags
          result.items = await VideoEnrichmentService.enrichVideos(result.items, accountId);

          var shouldProxyThumbnails = +settings.RELAY_PROXY_THUMBNAILS === 1;

          if (shouldProxyThumbnails && Array.isArray(result.items)) {
            result.items.forEach(function (itemRef) {
              ProxyHelper.wrapObjectThumbnail(req, itemRef, token);
            });
          }

          res.json(result);
        }
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = FeedController;

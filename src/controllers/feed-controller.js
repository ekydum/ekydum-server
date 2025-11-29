var Joi = require('joi');
var FeedService = require('../services/feed-service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');

var FeedController = {
  _schemaGetFeed: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    page_size: Joi.number().integer().min(10).max(100)
  }),

  getFeed: function () {
    return async function (req, res, next) {
      try {
        var accountId = req.account.id;
        var token = req.account.token;
        var settings = await ClientSettingsHelper.getSettings(accountId);
        var pageSize = settings.PAGE_SIZE ? parseInt(settings.PAGE_SIZE) : 30;
        var page = parseInt(req.query.page) || 1;

        var { error, value } = FeedController._schemaGetFeed.validate({
          page: page,
          page_size: req.query.page_size ? parseInt(req.query.page_size) : pageSize
        });

        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var result = await FeedService.getFeed(accountId, value.page, value.page_size);
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

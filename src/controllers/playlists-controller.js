var Joi = require('joi');
var YtdlpService = require('../services/yt-service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');
var { GLOBAL_PAGE_SIZE } = require('../config/constants');

var PlaylistsController = {
  _schemaGetPlaylistVideos: Joi.object({
    page: Joi.number().integer().min(1)
  }),

  getPlaylistVideos: function () {
    return async function(req, res, next) {
      try {
        var ytPlaylistId = req.params.yt_playlist_id;
        var accountId = req.account.id;
        var token = req.account.token;
        var page = parseInt(req.query.page) || 1;

        var { error, value } = PlaylistsController._schemaGetPlaylistVideos.validate({
          page: page
        });

        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var [result, settings] = await Promise.all([
            YtdlpService.getPlaylistVideos(ytPlaylistId, value.page, GLOBAL_PAGE_SIZE, accountId),
            ClientSettingsHelper.getSettings(accountId),
          ]);

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
  }
};

module.exports = PlaylistsController;

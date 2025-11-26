var Joi = require('joi');
var YtdlpService = require('../services/yt-service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');

var PlaylistsController = {
  _schemaGetPlaylistVideos: Joi.object({
    page: Joi.number().integer().min(1),
    page_size: Joi.number().integer().min(10).max(1000)
  }),

  getPlaylistVideos: function () {
    return async function(req, res, next) {
      try {
        var ytPlaylistId = req.params.yt_playlist_id;
        var accountId = req.account.id;
        var token = req.account.token;
        var settings = await ClientSettingsHelper.getSettings(accountId);
        var pageSize = settings.PAGE_SIZE ? parseInt(settings.PAGE_SIZE) : 50;
        var page = parseInt(req.query.page) || 1;

        var { error, value } = PlaylistsController._schemaGetPlaylistVideos.validate({
          page: page,
          page_size: req.query.page_size ? parseInt(req.query.page_size) : pageSize
        });

        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var result = await YtdlpService.getPlaylistVideos(ytPlaylistId, value.page, value.page_size, accountId);

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

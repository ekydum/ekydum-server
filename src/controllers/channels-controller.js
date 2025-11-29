var Joi = require('joi');
var YtdlpService = require('../services/yt-service');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');
var { GLOBAL_PAGE_SIZE } = require('../config/constants');

var ChannelsController = {
  _schemaSearchChannels: Joi.object({
    q: Joi.string().required().min(1)
  }),
  _schemaGetChannelVideos: Joi.object({
    page: Joi.number().integer().min(1)
  }),

  searchChannels: function () {
    return async function(req, res, next) {
      try {
        var accountId = req.account.id;
        var { error, value } = ChannelsController._schemaSearchChannels.validate(req.body);
        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var channels = await YtdlpService.searchChannels(value.q, accountId);
          res.json({ channels });
        }
      } catch (err) {
        next(err);
      }
    };
  },

  getChannelInfo: function () {
    return async function(req, res, next) {
      try {
        var ytChannelId = req.params.yt_channel_id;
        var accountId = req.account.id;
        var token = req.account.token;
        var [channelInfo, settings] = await Promise.all([
          YtdlpService.getChannelInfo(ytChannelId, accountId),
          ClientSettingsHelper.getSettings(accountId),
        ]);
        var shouldProxyThumbnails = +settings.RELAY_PROXY_THUMBNAILS === 1;

        if (shouldProxyThumbnails && channelInfo?.thumbnail) {
          ProxyHelper.wrapObjectThumbnail(req, channelInfo, token);
        }

        res.json(channelInfo);
      } catch (err) {
        next(err);
      }
    };
  },

  getChannelVideos: function () {
    return async function(req, res, next) {
      try {
        var ytChannelId = req.params.yt_channel_id;
        var accountId = req.account.id;
        var token = req.account.token;
        var page = parseInt(req.query.page) || 1;

        var { error, value } = ChannelsController._schemaGetChannelVideos.validate({
          page: page
        });

        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var [result, settings] = await Promise.all([
            YtdlpService.getChannelVideos(ytChannelId, value.page, GLOBAL_PAGE_SIZE, accountId),
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
  },

  getChannelPlaylists: function () {
    return async function(req, res, next) {
      try {
        var ytChannelId = req.params.yt_channel_id;
        var accountId = req.account.id;
        var token = req.account.token;

        var [playlists, settings] = await Promise.all([
          YtdlpService.getChannelPlaylists(ytChannelId, accountId),
          ClientSettingsHelper.getSettings(accountId),
        ]);

        var shouldProxyThumbnails = +settings.RELAY_PROXY_THUMBNAILS === 1;

        if (shouldProxyThumbnails && Array.isArray(playlists)) {
          playlists.forEach(function (plRef) {
            ProxyHelper.wrapObjectThumbnail(req, plRef, token);
          });
        }

        res.json({ playlists: playlists });
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = ChannelsController;

var Joi = require('joi');
var YtdlpService = require('../services/ytdlp-service');
var { Setting } = require('../models');

var ChannelsController = {
  searchChannels: async function(req, res, next) {
    try {
      var schema = Joi.object({
        q: Joi.string().required().min(1)
      });

      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }

      var channels = await YtdlpService.searchChannels(value.q, req.account.id);

      res.json({ channels: channels });
    } catch (err) {
      next(err);
    }
  },

  getChannelInfo: async function(req, res, next) {
    try {
      var ytChannelId = req.params.yt_channel_id;
      var channelInfo = await YtdlpService.getChannelInfo(ytChannelId, req.account.id);

      res.json(channelInfo);
    } catch (err) {
      next(err);
    }
  },

  getChannelVideos: async function(req, res, next) {
    try {
      var ytChannelId = req.params.yt_channel_id;

      var pageSizeSetting = await Setting.findOne({
        where: {
          account_id: req.account.id,
          key: 'PAGE_SIZE'
        }
      });

      var pageSize = pageSizeSetting ? parseInt(pageSizeSetting.value) : 50;
      var page = parseInt(req.query.page) || 1;

      var schema = Joi.object({
        page: Joi.number().integer().min(1),
        page_size: Joi.number().integer().valid(10, 20, 30, 50, 100, 200, 300, 500)
      });

      var { error, value } = schema.validate({
        page: page,
        page_size: req.query.page_size ? parseInt(req.query.page_size) : pageSize
      });

      if (error) {
        error.isJoi = true;
        return next(error);
      }

      var result = await YtdlpService.getChannelVideos(
        ytChannelId,
        value.page,
        value.page_size,
        req.account.id
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getChannelPlaylists: async function(req, res, next) {
    try {
      var ytChannelId = req.params.yt_channel_id;
      var playlists = await YtdlpService.getChannelPlaylists(ytChannelId, req.account.id);

      res.json({ playlists: playlists });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = ChannelsController;

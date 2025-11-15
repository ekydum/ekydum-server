var Joi = require('joi');
var YtdlpService = require('../services/ytdlp-service');
var { Setting } = require('../models');

var PlaylistsController = {
  getPlaylistVideos: async function(req, res, next) {
    try {
      var ytPlaylistId = req.params.yt_playlist_id;

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

      var result = await YtdlpService.getPlaylistVideos(
        ytPlaylistId,
        value.page,
        value.page_size,
        req.account.id
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = PlaylistsController;

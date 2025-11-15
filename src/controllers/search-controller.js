var Joi = require('joi');
var YtdlpService = require('../services/ytdlp-service');

var SearchController = {
  searchVideos: function () {
    return async function(req, res, next) {
      try {
        var schema = Joi.object({
          q: Joi.string().required().min(1),
          offset: Joi.number().integer().min(0).default(0),
          limit: Joi.number().integer().min(1).max(50).default(20)
        });

        var { error, value } = schema.validate(req.body);
        if (error) {
          error.isJoi = true;
          return next(error);
        }

        var videos = await YtdlpService.searchVideos(value.q, value.offset, value.limit);

        res.json({ videos: videos });
      } catch (err) {
        next(err);
      }
    };
  }
};

module.exports = SearchController;

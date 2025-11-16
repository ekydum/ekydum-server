var Joi = require('joi');
var { WatchLaterVideo, SavedVideo, SavedChannel } = require('../models');

var WatchLaterController = {
  getWatchLater: async function(req, res, next) {
    try {
      var watchLater = await WatchLaterVideo.findAll({
        where: { account_id: req.account.id },
        include: [{
          model: SavedVideo,
          as: 'video',
          attributes: ['yt_video_id', 'title', 'thumbnail', 'duration'],
          include: [{
            model: SavedChannel,
            as: 'channel',
            attributes: ['yt_channel_id', 'name']
          }]
        }],
        order: [['created_at', 'DESC']]
      });

      var result = watchLater.map(function(w) {
        return {
          yt_video_id: w.video.yt_video_id,
          title: w.video.title,
          thumbnail: w.video.thumbnail,
          duration: w.video.duration,
          channel_id: w.video.channel ? w.video.channel.yt_channel_id : null,
          channel_name: w.video.channel ? w.video.channel.name : null,
          created_at: w.created_at
        };
      });

      res.json({ videos: result });
    } catch (err) {
      next(err);
    }
  },

  addWatchLater: async function(req, res, next) {
    try {
      var schema = Joi.object({
        yt_video_id: Joi.string().required(),
        title: Joi.string().required().max(500),
        thumbnail: Joi.string().allow('', null),
        duration: Joi.number().integer().allow(null),
        yt_channel_id: Joi.string().allow('', null),
        channel_name: Joi.string().allow('', null)
      });

      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }

      var savedChannelId = null;
      if (value.yt_channel_id) {
        var [savedChannel] = await SavedChannel.findOrCreate({
          where: { yt_channel_id: value.yt_channel_id },
          defaults: {
            yt_channel_id: value.yt_channel_id,
            name: value.channel_name || 'Unknown'
          }
        });
        savedChannelId = savedChannel.id;
      }

      var [savedVideo] = await SavedVideo.findOrCreate({
        where: { yt_video_id: value.yt_video_id },
        defaults: {
          yt_video_id: value.yt_video_id,
          title: value.title,
          thumbnail: value.thumbnail || null,
          duration: value.duration || null,
          channel_id: savedChannelId
        }
      });

      var watchLater = await WatchLaterVideo.create({
        account_id: req.account.id,
        video_id: savedVideo.id
      });

      res.status(201).json({
        yt_video_id: savedVideo.yt_video_id,
        title: savedVideo.title
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Video already in Watch Later' });
      }
      next(err);
    }
  },

  removeWatchLater: async function(req, res, next) {
    try {
      var ytVideoId = req.params.yt_video_id;

      var savedVideo = await SavedVideo.findOne({
        where: { yt_video_id: ytVideoId }
      });

      if (!savedVideo) {
        return res.status(404).json({ error: 'Video not found' });
      }

      var deleted = await WatchLaterVideo.destroy({
        where: {
          account_id: req.account.id,
          video_id: savedVideo.id
        }
      });

      if (deleted === 0) {
        return res.status(404).json({ error: 'Watch Later video not found' });
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  checkWatchLater: async function(req, res, next) {
    try {
      var ytVideoId = req.params.yt_video_id;

      var savedVideo = await SavedVideo.findOne({
        where: { yt_video_id: ytVideoId }
      });

      if (!savedVideo) {
        return res.json({ watch_later: false });
      }

      var watchLater = await WatchLaterVideo.findOne({
        where: {
          account_id: req.account.id,
          video_id: savedVideo.id
        }
      });

      res.json({ watch_later: !!watchLater });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = WatchLaterController;

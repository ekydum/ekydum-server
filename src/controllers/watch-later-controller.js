var Joi = require('joi');
var { WatchLaterVideo, SavedVideo, SavedChannel } = require('../models');
const { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');

var WatchLaterController = {
  _schemaAddWatchLater: Joi.object({
    yt_video_id: Joi.string().required(),
    title: Joi.string().required().max(500),
    thumbnail: Joi.string().allow('', null),
    duration: Joi.number().integer().allow(null),
    yt_channel_id: Joi.string().allow('', null),
    channel_name: Joi.string().allow('', null)
  }),

  getWatchLater: function () {
    return async function(req, res, next) {
      try {
        var accountId = req.account.id;
        var token = req.account.token;
        var [watchLater, settings] = await Promise.all([
          WatchLaterVideo.findAll({
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
          }),
          ClientSettingsHelper.getSettings(accountId),
        ]);
        var shouldProxyThumbnails = +settings.RELAY_PROXY_THUMBNAILS === 1;

        var result = watchLater.map(function(w) {
          /** @type { YtVideoListItem } */
          var obj = {
            yt_id: w.video.yt_video_id,
            title: w.video.title,
            thumbnail: w.video.thumbnail,
            thumbnail_src: w.video.thumbnail,
            duration: w.video.duration,
            channel_id: w.video.channel ? w.video.channel.yt_channel_id : null,
            channel_name: w.video.channel ? w.video.channel.name : null,
            created_at: w.created_at
          };
          return shouldProxyThumbnails ? ProxyHelper.wrapObjectThumbnail(req, obj, token) : obj;
        });

        res.json({ videos: result });
      } catch (err) {
        next(err);
      }
    };
  },

  addWatchLater: function () {
    return async function(req, res, next) {
      try {
        var { error, value } = WatchLaterController._schemaAddWatchLater.validate(req.body);
        if (error) {
          error.isJoi = true;
          next(error);
        } else {
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
              thumbnail: value.thumbnail || null, // src thumbnail
              duration: value.duration || null,
              channel_id: savedChannelId
            }
          });

          await WatchLaterVideo.create({
            account_id: req.account.id,
            video_id: savedVideo.id
          });

          res.status(201).json({
            yt_video_id: savedVideo.yt_video_id,
            title: savedVideo.title
          });
        }
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          res.status(409).json({ error: 'Video already in Watch Later' });
        } else {
          next(err);
        }
      }
    };
  },

  removeWatchLater: function () {
    return async function(req, res, next) {
      try {
        var ytVideoId = req.params.yt_video_id;
        var savedVideo = await SavedVideo.findOne({
          where: { yt_video_id: ytVideoId }
        });
        // TODO: cleanup - savedVideo

        if (!savedVideo) {
          res.status(404).json({ error: 'Video not found' });
        } else {
          var deleted = await WatchLaterVideo.destroy({
            where: {
              account_id: req.account.id,
              video_id: savedVideo.id
            }
          });

          if (deleted === 0) {
            res.status(404).json({ error: 'Watch Later video not found' });
          } else {
            res.status(204).send();
          }
        }
      } catch (err) {
        next(err);
      }
    };
  },

  checkWatchLater: function () {
    return async function(req, res, next) {
      var result = { watch_later: false };

      try {
        var ytVideoId = req.params.yt_video_id;
        var savedVideo = await SavedVideo.findOne({
          where: { yt_video_id: ytVideoId }
        });

        if (savedVideo) {
          var watchLater = await WatchLaterVideo.findOne({
            where: {
              account_id: req.account.id,
              video_id: savedVideo.id
            }
          });
          result.watch_later = !!watchLater;
        }

        res.json(result);
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = WatchLaterController;

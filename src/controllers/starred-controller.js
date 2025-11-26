var Joi = require('joi');
var { StarredVideo, SavedVideo, SavedChannel } = require('../models');
const { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var ProxyHelper = require('../helpers/proxy.helper');

var StarredController = {
  _schemaAddStarred: Joi.object({
    yt_video_id: Joi.string().required(),
    title: Joi.string().required().max(500),
    thumbnail: Joi.string().allow('', null),
    duration: Joi.number().integer().allow(null),
    yt_channel_id: Joi.string().allow('', null),
    channel_name: Joi.string().allow('', null)
  }),

  getStarred: function () {
    return async function(req, res, next) {
      try {
        var accountId = req.account.id;
        var token = req.account.token;

        var [starred, settings] = await Promise.all([
          StarredVideo.findAll({
            where: { account_id: accountId },
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
          ClientSettingsHelper.getSettings(accountId)
        ]);
        var shouldProxyThumbnails = +settings.RELAY_PROXY_THUMBNAILS === 1;

        var result = starred.map(function(s) {
          /** @type { YtVideoListItem } */
          var obj = {
            yt_id: s.video.yt_video_id,
            title: s.video.title,
            thumbnail: s.video.thumbnail,
            thumbnail_src: s.video.thumbnail,
            duration: s.video.duration,
            channel_id: s.video.channel ? s.video.channel.yt_channel_id : null,
            channel_name: s.video.channel ? s.video.channel.name : null,
            created_at: s.created_at,
          };
          return shouldProxyThumbnails ? ProxyHelper.wrapObjectThumbnail(req, obj, token) : obj;
        });

        res.json({ videos: result });
      } catch (err) {
        next(err);
      }
    };
  },

  addStarred: function () {
    return async function(req, res, next) {
      try {
        var { error, value } = StarredController._schemaAddStarred.validate(req.body);
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

          await StarredVideo.create({
            account_id: req.account.id,
            video_id: savedVideo.id
          });

          res.json({
            yt_video_id: savedVideo.yt_video_id,
            title: savedVideo.title
          });
        }
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
          res.status(409).json({ error: 'Video already starred' });
        } else {
          next(err);
        }
      }
    };
  },

  removeStarred: function () {
    return async function(req, res, next) {
      try {
        var ytVideoId = req.params.yt_video_id;
        var savedVideo = await SavedVideo.findOne({
          where: { yt_video_id: ytVideoId }
        });
        // TODO: the saved video needs a cleanup if it has no references

        if (savedVideo) {
          var deleted = await StarredVideo.destroy({
            where: {
              account_id: req.account.id,
              video_id: savedVideo.id
            }
          });

          if (deleted === 0) {
            res.status(404).json({ error: 'Starred video not found' });
          } else {
            res.status(204).send();
          }
        } else {
          res.status(404).json({ error: 'Video not found' });
        }
      } catch (err) {
        next(err);
      }
    };
  },

  checkStarred: function () {
    return async function(req, res, next) {
      var result = { starred: false };

      try {
        var ytVideoId = req.params.yt_video_id;
        var savedVideo = await SavedVideo.findOne({
          where: { yt_video_id: ytVideoId }
        });

        if (savedVideo) {
          var starred = await StarredVideo.findOne({
            where: {
              account_id: req.account.id,
              video_id: savedVideo.id
            }
          });
          result.starred = !!starred;
        }

        res.json(result);
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = StarredController;

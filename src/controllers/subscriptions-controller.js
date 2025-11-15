var Joi = require('joi');
var { Subscription, SavedChannel } = require('../models');
var YtdlpService = require('../services/ytdlp-service');

var SubscriptionsController = {
  subscribe: async function(req, res, next) {
    try {
      var schema = Joi.object({
        yt_channel_id: Joi.string().required()
      });

      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }

      var channelInfo = await YtdlpService.getChannelInfo(value.yt_channel_id, req.account.id);

      var [savedChannel] = await SavedChannel.findOrCreate({
        where: { yt_channel_id: value.yt_channel_id },
        defaults: {
          yt_channel_id: value.yt_channel_id,
          name: channelInfo.name
        }
      });

      var subscription = await Subscription.create({
        account_id: req.account.id,
        channel_id: savedChannel.id
      });

      res.status(201).json({
        id: subscription.id,
        yt_channel_id: savedChannel.yt_channel_id,
        yt_channel_name: savedChannel.name,
        created_at: subscription.created_at
      });
    } catch (err) {
      next(err);
    }
  },

  getSubscriptions: async function(req, res, next) {
    try {
      var subscriptions = await Subscription.findAll({
        where: { account_id: req.account.id },
        include: [{
          model: SavedChannel,
          as: 'channel',
          attributes: ['yt_channel_id', 'name']
        }],
        order: [['created_at', 'DESC']]
      });

      var result = subscriptions.map(function(sub) {
        return {
          id: sub.id,
          yt_channel_id: sub.channel.yt_channel_id,
          yt_channel_name: sub.channel.name,
          created_at: sub.created_at
        };
      });

      res.json({ subscriptions: result });
    } catch (err) {
      next(err);
    }
  },

  unsubscribe: async function(req, res, next) {
    try {
      var subscription = await Subscription.findOne({
        where: {
          id: req.params.id,
          account_id: req.account.id
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      await subscription.destroy();

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = SubscriptionsController;

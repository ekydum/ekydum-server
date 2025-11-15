var Joi = require('joi');
var { Subscription } = require('../models');
var YtdlpService = require('../services/ytdlp-service');

var SubscriptionsController = {
  // Subscribe to channel
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

      // Get channel info from YouTube
      var channelInfo = await YtdlpService.getChannelInfo(value.yt_channel_id, req.account.id);

      // Create subscription
      var subscription = await Subscription.create({
        account_id: req.account.id,
        yt_channel_id: value.yt_channel_id,
        yt_channel_name: channelInfo.name
      });

      res.status(201).json({
        id: subscription.id,
        yt_channel_id: subscription.yt_channel_id,
        yt_channel_name: subscription.yt_channel_name,
        created_at: subscription.created_at
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all subscriptions
  getSubscriptions: async function(req, res, next) {
    try {
      var subscriptions = await Subscription.findAll({
        where: { account_id: req.account.id },
        attributes: ['id', 'yt_channel_id', 'yt_channel_name', 'created_at'],
        order: [['created_at', 'DESC']]
      });

      res.json({ subscriptions: subscriptions });
    } catch (err) {
      next(err);
    }
  },

  // Unsubscribe
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

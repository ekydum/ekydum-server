var cron = require('node-cron');
var Bluebird = require('bluebird');
var { Op } = require('sequelize');
var { Subscription, SavedChannel, SavedVideo } = require('../models');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var YtService = require('./yt-service');
var { GLOBAL_PAGE_SIZE, GLOBAL_CONCURRENCY } = require('../config/constants');

var FeedService = {
  // Configuration
  _CRON_INTERVAL: '*/30 * * * *', // Every 30 minutes
  _PAGES_PER_CHANNEL: 1,
  _cronTask: null,

  /**
   * Start the cron job for feed updates
   */
  startCron: function () {
    if (FeedService._cronTask) {
      console.log('[FeedService] Cron already running');
      return;
    }

    console.log('[FeedService] Starting cron with interval:', FeedService._CRON_INTERVAL);

    FeedService._cronTask = cron.schedule(FeedService._CRON_INTERVAL, function () {
      console.log('[FeedService] Cron triggered at', new Date().toISOString());
      FeedService.refreshAllFeeds().catch(function (err) {
        console.error('[FeedService] Cron error:', err);
      });
    });

    // Run immediately on start
    FeedService.refreshAllFeeds().catch(function (err) {
      console.error('[FeedService] Initial refresh error:', err);
    });
  },

  /**
   * Stop the cron job
   */
  stopCron: function () {
    if (FeedService._cronTask) {
      FeedService._cronTask.stop();
      FeedService._cronTask = null;
      console.log('[FeedService] Cron stopped');
    }
  },

  /**
   * Refresh feeds for all subscribed channels
   * @returns {Promise<void>}
   */
  refreshAllFeeds: async function () {
    console.log('[FeedService] Starting feed refresh');

    // Get all unique channel+lang combinations from subscriptions
    var channelLangPairs = await FeedService._getAllChannelLangPairs();
    console.log('[FeedService] Found', channelLangPairs.length, 'channel+lang pairs to refresh');

    await Bluebird.map(
      channelLangPairs,
      function (pair) {
        return FeedService._refreshChannelVideos(pair.savedChannelId, pair.ytChannelId, pair.lang);
      },
      { concurrency: GLOBAL_CONCURRENCY }
    );

    console.log('[FeedService] Feed refresh completed');
  },

  /**
   * Get feed for a specific account
   * @param {string} accountId
   * @param {number} page
   * @param {number} pageSize
   * @returns {Promise<{ items: YtVideoListItem[], pagination: object }>}
   */
  getFeed: async function (accountId, page, pageSize) {
    var settings = await ClientSettingsHelper.getSettings(accountId);
    var lang = settings.LANG || 'en';

    // Get user's subscribed channels (SavedChannel IDs)
    var subscriptions = await Subscription.findAll({
      where: { account_id: accountId },
      include: [{
        model: SavedChannel,
        as: 'channel',
        attributes: ['id']
      }]
    });

    if (subscriptions.length === 0) {
      return {
        items: [],
        pagination: { page: page, page_size: pageSize, has_next: false }
      };
    }

    var channelIds = subscriptions.map(function (sub) {
      return sub.channel.id;
    });

    // Get videos from DB
    var offset = (page - 1) * pageSize;
    var videos = await SavedVideo.findAll({
      where: {
        channel_id: { [Op.in]: channelIds },
        lang: lang
      },
      include: [{
        model: SavedChannel,
        as: 'channel',
        attributes: ['yt_channel_id', 'name']
      }],
      order: [['created_at', 'DESC']],
      limit: pageSize + 1, // +1 to check has_next
      offset: offset
    });

    var hasNext = videos.length > pageSize;
    if (hasNext) {
      videos = videos.slice(0, pageSize);
    }

    // Map to YtVideoListItem format
    var items = videos.map(function (v) {
      return {
        yt_id: v.yt_video_id,
        title: v.title,
        thumbnail: v.thumbnail,
        thumbnail_src: v.thumbnail,
        duration: v.duration,
        channel_id: v.channel ? v.channel.yt_channel_id : null,
        channel_name: v.channel ? v.channel.name : null,
        upload_date: v.created_at ? v.created_at.toISOString() : null,
        view_count: null
      };
    });

    return {
      items: items,
      pagination: {
        page: page,
        page_size: pageSize,
        has_next: hasNext
      }
    };
  },

  /**
   * Get all unique channel+lang pairs from all subscriptions
   * @returns {Promise<Array<{ savedChannelId: string, ytChannelId: string, lang: string }>>}
   * @private
   */
  _getAllChannelLangPairs: async function () {
    // Get all subscriptions with their account settings
    var subscriptions = await Subscription.findAll({
      include: [{
        model: SavedChannel,
        as: 'channel',
        attributes: ['id', 'yt_channel_id']
      }],
      attributes: ['account_id']
    });

    // Group by account to get settings
    var accountChannels = {};
    subscriptions.forEach(function (sub) {
      var accountId = sub.account_id;
      if (!accountChannels[accountId]) {
        accountChannels[accountId] = [];
      }
      accountChannels[accountId].push({
        savedChannelId: sub.channel.id,
        ytChannelId: sub.channel.yt_channel_id
      });
    });

    // Get unique channel+lang pairs
    var pairsMap = {};
    var accountIds = Object.keys(accountChannels);

    await Bluebird.map(
      accountIds,
      async function (accountId) {
        var settings = await ClientSettingsHelper.getSettings(accountId);
        var lang = settings.LANG || 'en';
        var channels = accountChannels[accountId];

        channels.forEach(function (ch) {
          var key = ch.ytChannelId + ':' + lang;
          if (!pairsMap[key]) {
            pairsMap[key] = {
              savedChannelId: ch.savedChannelId,
              ytChannelId: ch.ytChannelId,
              lang: lang
            };
          }
        });
      },
      { concurrency: 10 }
    );

    return Object.values(pairsMap);
  },

  /**
   * Refresh videos for a specific channel and save to DB
   * @param {string} savedChannelId - UUID of SavedChannel
   * @param {string} ytChannelId - YouTube channel ID
   * @param {string} lang
   * @returns {Promise<void>}
   * @private
   */
  _refreshChannelVideos: async function (savedChannelId, ytChannelId, lang) {
    try {
      for (var page = 1; page <= FeedService._PAGES_PER_CHANNEL; page++) {
        var result = await YtService.getChannelVideos2(ytChannelId, page, GLOBAL_PAGE_SIZE, lang);

        // Save each video to DB
        await Bluebird.map(
          result.items,
          function (video) {
            return FeedService._saveVideo(video, savedChannelId, lang);
          },
          { concurrency: 5 }
        );
      }
    } catch (err) {
      console.error('[FeedService] Failed to refresh channel', ytChannelId, ':', err.message);
    }
  },

  /**
   * Save a video to DB (findOrCreate)
   * @param {YtVideoListItem} video
   * @param {string} savedChannelId
   * @param {string} lang
   * @returns {Promise<void>}
   * @private
   */
  _saveVideo: async function (video, savedChannelId, lang) {
    try {
      await SavedVideo.findOrCreate({
        where: {
          yt_video_id: video.yt_id,
          lang: lang
        },
        defaults: {
          yt_video_id: video.yt_id,
          lang: lang,
          title: video.title,
          thumbnail: video.thumbnail_src || video.thumbnail,
          duration: video.duration || null,
          channel_id: savedChannelId
        }
      });
    } catch (err) {
      console.error('[FeedService] Failed to save video', video.yt_id, ':', err.message, err.errors || '');
    }
  },
};

module.exports = FeedService;

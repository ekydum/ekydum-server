var cron = require('node-cron');
var Bluebird = require('bluebird');
var { Subscription, SavedChannel } = require('../models');
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');
var CacheService = require('./cache-service');
var YtService = require('./yt-service');

var FeedService = {
  // Configuration
  _CRON_INTERVAL: '*/30 * * * *', // Every 30 minutes
  _PAGES_PER_CHANNEL: 1,
  _CONCURRENCY: 3,
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
    var fetchedAt = Date.now();
    console.log('[FeedService] Starting feed refresh');

    // Get all unique channel+lang combinations from subscriptions
    var channelLangPairs = await FeedService._getAllChannelLangPairs();
    console.log('[FeedService] Found', channelLangPairs.length, 'channel+lang pairs to refresh');

    await Bluebird.map(
      channelLangPairs,
      function (pair) {
        return FeedService._refreshChannelVideos(pair.ytChannelId, pair.lang, fetchedAt);
      },
      { concurrency: FeedService._CONCURRENCY }
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

    // Get user's subscribed channels
    var subscriptions = await Subscription.findAll({
      where: { account_id: accountId },
      include: [{
        model: SavedChannel,
        as: 'channel',
        attributes: ['yt_channel_id']
      }]
    });

    if (subscriptions.length === 0) {
      return {
        items: [],
        pagination: { page: page, page_size: pageSize, has_next: false }
      };
    }

    var channelIds = subscriptions.map(function (sub) {
      return sub.channel.yt_channel_id;
    });

    // Collect videos from all channels
    var allVideos = await FeedService._collectVideosFromChannels(channelIds, lang, pageSize);

    // Sort by fetched_at DESC
    allVideos.sort(function (a, b) {
      return (b.fetched_at || 0) - (a.fetched_at || 0);
    });

    // Paginate
    var startIdx = (page - 1) * pageSize;
    var endIdx = startIdx + pageSize;
    var pageItems = allVideos.slice(startIdx, endIdx);

    return {
      items: pageItems,
      pagination: {
        page: page,
        page_size: pageSize,
        has_next: allVideos.length > endIdx
      }
    };
  },

  /**
   * Get all unique channel+lang pairs from all subscriptions
   * @returns {Promise<Array<{ ytChannelId: string, lang: string }>>}
   * @private
   */
  _getAllChannelLangPairs: async function () {
    // Get all subscriptions with their account settings
    var subscriptions = await Subscription.findAll({
      include: [{
        model: SavedChannel,
        as: 'channel',
        attributes: ['yt_channel_id']
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
      accountChannels[accountId].push(sub.channel.yt_channel_id);
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

        channels.forEach(function (ytChannelId) {
          var key = ytChannelId + ':' + lang;
          if (!pairsMap[key]) {
            pairsMap[key] = { ytChannelId: ytChannelId, lang: lang };
          }
        });
      },
      { concurrency: 10 }
    );

    return Object.values(pairsMap);
  },

  /**
   * Refresh videos for a specific channel
   * @param {string} ytChannelId
   * @param {string} lang
   * @param {number} fetchedAt
   * @returns {Promise<void>}
   * @private
   */
  _refreshChannelVideos: async function (ytChannelId, lang, fetchedAt) {
    try {
      var pageSize = 30; // Default page size for cron

      for (var page = 1; page <= FeedService._PAGES_PER_CHANNEL; page++) {
        // getChannelVideos2 caches internally, but we need to add fetched_at
        // So we invalidate cache first to force fresh fetch
        var cacheKey = CacheService.keys.ytChannelVideos(ytChannelId, page, pageSize, lang);
        await CacheService.del(cacheKey);

        var result = await YtService.getChannelVideos2(ytChannelId, page, pageSize, lang);

        // Add fetched_at to each video and re-cache
        var videosWithTimestamp = result.items.map(function (video) {
          return Object.assign({}, video, { fetched_at: fetchedAt });
        });

        await CacheService.set(cacheKey, {
          items: videosWithTimestamp,
          pagination: result.pagination
        }, CacheService.TTL.CHANNEL_VIDEOS);
      }
    } catch (err) {
      console.error('[FeedService] Failed to refresh channel', ytChannelId, ':', err.message);
    }
  },

  /**
   * Collect videos from multiple channels (with fallback fetch)
   * @param {string[]} channelIds
   * @param {string} lang
   * @param {number} pageSize
   * @returns {Promise<YtVideoListItem[]>}
   * @private
   */
  _collectVideosFromChannels: async function (channelIds, lang, pageSize) {
    var allVideos = [];
    var fetchedAt = Date.now();

    await Bluebird.map(
      channelIds,
      async function (ytChannelId) {
        var videos = await FeedService._getChannelVideosWithFallback(
          ytChannelId,
          lang,
          pageSize,
          fetchedAt
        );
        videos.forEach(function (v) {
          allVideos.push(v);
        });
      },
      { concurrency: FeedService._CONCURRENCY }
    );

    return allVideos;
  },

  /**
   * Get channel videos from cache or fetch on-the-fly
   * @param {string} ytChannelId
   * @param {string} lang
   * @param {number} pageSize
   * @param {number} fetchedAt
   * @returns {Promise<YtVideoListItem[]>}
   * @private
   */
  _getChannelVideosWithFallback: async function (ytChannelId, lang, pageSize, fetchedAt) {
    var page = 1;
    var cacheKey = CacheService.keys.ytChannelVideos(ytChannelId, page, pageSize, lang);
    var cached = await CacheService.get(cacheKey);

    if (cached && cached.items) {
      return cached.items;
    }

    // Fallback: fetch on-the-fly via YtService
    try {
      var result = await YtService.getChannelVideos2(ytChannelId, page, pageSize, lang);

      var videosWithTimestamp = result.items.map(function (video) {
        return Object.assign({}, video, { fetched_at: fetchedAt });
      });

      // Re-cache with fetched_at
      await CacheService.set(cacheKey, {
        items: videosWithTimestamp,
        pagination: result.pagination
      }, CacheService.TTL.CHANNEL_VIDEOS);

      return videosWithTimestamp;
    } catch (err) {
      console.error('[FeedService] Failed to fetch channel', ytChannelId, ':', err.message);
      return [];
    }
  },
};

module.exports = FeedService;

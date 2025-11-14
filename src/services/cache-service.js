var redis = require('../config/redis');
var crypto = require('crypto');

var CacheService = {
  // TTL in seconds
  TTL: {
    CHANNEL_INFO: 3600,        // 1 hour
    CHANNEL_VIDEOS: 1800,      // 30 minutes
    CHANNEL_SEARCH: 3600,      // 1 hour
    VIDEO_INFO: 3600 * 5,       // 5 hours
    ACCOUNT_TOKEN: 600,         // 10 minutes
  },

  // Generate hash for search query
  hashQuery: function(query) {
    return crypto.createHash('md5').update(query).digest('hex');
  },

  // Get cached data
  get: async function(key) {
    var j, d = null;
    try {
      j = await redis.get(key);
      d = j ? JSON.parse(j) : null;
    } catch (error) {
      console.error('Cache get error:', error);
    }
    return d;
  },

  // Set cached data with TTL
  set: async function(key, value, ttl) {
    var r = false;
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      r = true;
    } catch (error) {
      console.error('Cache set error:', error);
    }
    return r;
  },

  // Delete cached data
  del: async function(key) {
    var r = false;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
    }
    return r;
  },

  // Cache keys generators
  keys: {
    channelInfo: function(ytChannelId) {
      return 'channel:info:' + ytChannelId;
    },
    channelVideos: function(ytChannelId, page, pageSize) {
      return 'channel:videos:' + ytChannelId + ':' + page + ':' + pageSize;
    },
    channelSearch: function(query) {
      return 'channel:search:' + CacheService.hashQuery(query);
    },
    videoInfo: function(videoId) {
      return 'video:info:' + videoId;
    },
    accountToken: function(token) {
      return 'account:token:' + token;
    },
  }
};

module.exports = CacheService;

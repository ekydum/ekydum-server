var redis = require('../config/redis');
var crypto = require('crypto');

var CacheService = {
  // TTL in seconds
  TTL: {
    CHANNEL_INFO: 3600,        // 1 hour
    CHANNEL_VIDEOS: 1800,      // 30 minutes
    CHANNEL_SEARCH: 3600,      // 1 hour
    VIDEO_URL: 21600,          // 6 hours
    VIDEO_INFO: 3600           // 1 hour
  },

  // Generate hash for search query
  hashQuery: function(query) {
    return crypto.createHash('md5').update(query).digest('hex');
  },

  // Get cached data
  get: async function(key) {
    try {
      var data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  // Set cached data with TTL
  set: async function(key, value, ttl) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  // Delete cached data
  del: async function(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
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
    videoUrl: function(videoId, quality) {
      return 'video:url:' + videoId + ':' + quality;
    },
    videoInfo: function(videoId) {
      return 'video:info:' + videoId;
    }
  }
};

module.exports = CacheService;

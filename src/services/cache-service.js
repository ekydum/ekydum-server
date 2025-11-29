var redis = require('../config/redis');
var crypto = require('crypto');

var CacheService = {
  // TTL in seconds
  TTL: {
    CHANNEL_INFO: 3600,             // 1 hour
    CHANNEL_PLAYLISTS: 3600,        // 1 hour
    CHANNEL_VIDEOS: 60 * 5,         // 5 minutes
    CHANNEL_PLAYLIST_VIDEOS: 1800,  // 30 minutes
    CHANNEL_SEARCH: 3600,           // 1 hour
    VIDEO_INFO: 3600 * 5,           // 5 hours
    ACCOUNT_TOKEN: 600,             // 10 minutes
    LOGIN_REQUEST: 86400,           // 24 hours
    ACCOUNT_SETTINGS: 600,          // 10 minutes
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
      r = true;
    } catch (error) {
      console.error('Cache delete error:', error);
    }
    return r;
  },

  // Cache keys generators
  keys: {
    ytChannelInfo: function(ytChannelId, lang) {
      return 'yt:channel:info:' + ytChannelId + ':' + lang;
    },
    ytChannelVideos: function(ytChannelId, page, pageSize, lang) {
      return 'yt:channel:videos:' + ytChannelId + ':' + page + ':' + pageSize + ':' + lang;
    },
    ytChannelSearch: function(query, lang) {
      return 'yt:channel:search:' + CacheService.hashQuery(query) + ':' + lang;
    },
    ytChannelPlaylists: function(ytChannelId, lang) {
      return 'yt:playlists:' + ytChannelId + ':' + lang;
    },
    ytChannelPlaylistVideos: function(ytPlaylistId, page, pageSize, lang) {
      return 'yt:playlist:' + ytPlaylistId + ':' + page + ':' + pageSize + ':' + lang;
    },
    ytVideoInfo: function(videoId, lang) {
      return 'yt:video:info:' + videoId + ':' + lang;
    },
    // account settings
    accountSettings: function(accountId) {
      return 'account:' + accountId + ':settings';
    },
    // auth
    authAccountToken: function(token) {
      return 'auth:account:token:' + token;
    },
    // quick connect
    qcLoginRequest: function(requestId) {
      return 'qc:login_request:' + requestId;
    },
    qcAccountLoginRequests: function(accountId) {
      return 'qc:account:' + accountId + ':login_requests';
    },
  },

  // Get keys by pattern
  getKeys: async function(pattern) {
    var r;
    try {
      r = await redis.keys(pattern);
    } catch (error) {
      console.error('Cache keys error:', error);
      r = [];
    }
    return r;
  }
};

module.exports = CacheService;

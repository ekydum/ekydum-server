var { Setting } = require('../models');
var CacheService = require('../services/cache-service');

/** @type { SettingsObject } */
var DEFAULT_SETTINGS = {
  DEFAULT_QUALITY: '720p',
  PAGE_SIZE: '30',
  LANG: 'en',
  RELAY_PROXY_THUMBNAILS: '0',
};

var MEMORY_CACHE_TTL = 60 * 1000; // 1 minute in milliseconds
var memoryCache = {};

var ClientSettingsHelper = {
  /**
   * @param { string } accountId
   * @returns {Promise<SettingsObject>}
   */
  getSettings: async function(accountId) {
    var now = Date.now();
    var result = null;

    // Check memory cache first
    if (memoryCache[accountId]) {
      var cached = memoryCache[accountId];
      if (now - cached.timestamp < MEMORY_CACHE_TTL) {
        result = cached.data;
      } else {
        delete memoryCache[accountId];
      }
    }

    // Check Redis cache if not in memory
    if (!result) {
      var cacheKey = CacheService.keys.accountSettings(accountId);
      result = await CacheService.get(cacheKey);

      // Fetch from database if not in Redis
      if (!result) {
        result = {};
        var settings = await Setting.findAll({
          where: { account_id: accountId },
          attributes: ['key', 'value']
        });
        var settingsMap = {};
        settings.forEach(function (setting) {
          settingsMap[setting.key] = setting.value;
        });
        Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
          result[key] = settingsMap[key] !== undefined
            ? settingsMap[key]
            : DEFAULT_SETTINGS[key];
        });

        await CacheService.set(cacheKey, result, CacheService.TTL.ACCOUNT_SETTINGS);
      }

      // Save to memory cache
      memoryCache[accountId] = {
        data: result,
        timestamp: now
      };
    }

    return result;
  },

  /**
   * @param {string} accountId
   * @returns {Promise<void>}
   */
  clearCache: async function(accountId) {
    delete memoryCache[accountId];
    await CacheService.del(
      CacheService.keys.accountSettings(accountId)
    );
  },
};

module.exports = {
  ClientSettingsHelper,
  DEFAULT_SETTINGS,
};

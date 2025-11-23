var Joi = require('joi');
var { Setting } = require('../models');
var {
  ClientSettingsHelper,
  DEFAULT_SETTINGS,
} = require('../helpers/client-settings.helper');

var SETTING_SCHEMAS = {
  DEFAULT_QUALITY: Joi.string().valid('min', '360p', '480p', '720p', '1080p', '2k', '4k', 'max').required(),
  PAGE_SIZE: Joi.number().integer().valid(10, 20, 30, 50, 100, 200, 300, 500).required(),
  LANG: Joi.string().regex(/^[a-z]{2}$/).required(),
  RELAY_PROXY_THUMBNAILS: Joi.number().valid(0, 1).required(),
};

var SettingsController = {
  getSettings: function () {
    return async function(req, res, next) {
      try {
        var settings = await Setting.findAll({
          where: { account_id: req.account.id },
          attributes: ['id', 'key', 'value']
        });

        // Add default settings if not exists
        var settingsMap = {};
        settings.forEach(function(setting) {
          settingsMap[setting.key] = setting;
        });

        var result = [];
        Object.keys(DEFAULT_SETTINGS).forEach(function(key) {
          if (settingsMap[key]) {
            result.push({
              id: settingsMap[key].id,
              key: key,
              value: settingsMap[key].value
            });
          } else {
            result.push({
              id: null,
              key: key,
              value: DEFAULT_SETTINGS[key]
            });
          }
        });

        res.json({ settings: result });
      } catch (err) {
        next(err);
      }
    };
  },

  updateSetting: function () {
    return async function(req, res, next) {
      try {
        var key = req.params.key;

        // Validate setting key
        if (!SETTING_SCHEMAS[key]) {
          res.status(400).json({ error: 'Invalid setting key' });
        } else {
          // Validate value
          var schema = Joi.object({
            value: SETTING_SCHEMAS[key]
          });

          var { error, value } = schema.validate(req.body);
          if (error) {
            error.isJoi = true;
            next(error);
          } else {
            // Update or create setting
            var [setting, created] = await Setting.findOrCreate({
              where: {
                account_id: req.account.id,
                key: key
              },
              defaults: {
                value: value.value.toString()
              }
            });

            if (!created) {
              setting.value = value.value.toString();
              await setting.save();
            }

            // Clear cache
            await ClientSettingsHelper.clearCache(req.account.id);

            res.json({
              id: setting.id,
              key: setting.key,
              value: setting.value
            });
          }
        }
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = SettingsController;

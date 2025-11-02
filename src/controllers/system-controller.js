var sequelize = require('../config/database');
var redis = require('../config/redis');
var pkg = require('../../package.json');

var SystemController = {
  getServerInfo: function () {
    return function(req, res) {
      res.json({
        server: pkg.name,
        version: pkg.version,
        description: pkg.description,
        ts: new Date().getTime(),
      });
    };
  },

  getHealth: function () {
    return async function(req, res) {
      var health = {
        status: 'ok',
        db: 'ok',
        cache: 'ok',
        ts: new Date().getTime(),
      };

      try {
        await sequelize.authenticate();
      } catch (error) {
        health.db = 'error';
        health.status = 'error';
      }

      try {
        await redis.ping();
      } catch (error) {
        health.cache = 'error';
        health.status = 'error';
      }

      var statusCode = health.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(health);
    };
  },

  err404: function () {
    return function(req, res) {
      res.status(404).json({ error: 'NOT_FOUND' });
    };
  },
};

module.exports = SystemController;

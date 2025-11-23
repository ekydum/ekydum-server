var { Account } = require('../models');
var CacheService = require('../services/cache-service');

// Admin token middleware
function requireAdminToken() {
  var ADMIN_TOKEN = process.env.ADMIN_TOKEN;
  return function (req, res, next) {
    var token = req.headers['x-admin-token'];
    if (!token) {
      res.status(401).json({ error: 'Admin token required' });
    } else if (token !== ADMIN_TOKEN) {
      res.status(403).json({ error: 'Invalid admin token' });
    } else {
      next();
    }
  };
}

// Account token middleware
function requireAccountToken(allowInactive = false) {
  return async function (req, res, next) {
    try {
      var token = req.headers['x-account-token'] || req.query.token;
      if (!token) {
        res.status(401).json({ error: 'Account token required' });
      } else {
        var cacheKey = CacheService.keys.accountToken(token),
            account = await CacheService.get(cacheKey);
        if (!account) {
          account = await Account.findOne({ where: { token } });
          if (account) {
            await CacheService.set(cacheKey, account, CacheService.TTL.ACCOUNT_TOKEN);
          }
        }
        if (!account) {
          res.status(403).json({ error: 'Invalid account token' });
        } else if (account.status === Account.STATUS.BLOCKED) {
          res.status(403).json({ error: 'Account is blocked' });
        } else if (!allowInactive && (account.status === Account.STATUS.INACTIVE)) {
          res.status(403).json({ error: 'Account is not activated yet' });
        } else {
          req.account = account;
          next();
        }
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  requireAdminToken,
  requireAccountToken,
};

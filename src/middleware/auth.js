var { Account } = require('../models');
var CacheService = require('../services/cache-service');

// Admin token middleware
function requireAdminToken(req, res, next) {
  var token = req.headers['x-admin-token'];
  if (!token) {
    res.status(401).json({ error: 'Admin token required' });
  } else if (token !== process.env.ADMIN_TOKEN) {
    res.status(403).json({ error: 'Invalid admin token' });
  } else {
    next();
  }
}

// Account token middleware
async function requireAccountToken(req, res, next) {
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
      if (account) {
        req.account = account;
        next();
      } else {
        res.status(403).json({ error: 'Invalid account token' });
      }
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAdminToken,
  requireAccountToken
};

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
      return res.status(401).json({ error: 'Account token required' });
    }

    var cacheKey = CacheService.keys.accountToken(token),
      account = await CacheService.get(cacheKey);

    if (!account) {
      account = await Account.findOne({ where: { token } });
      if (account) {
        await CacheService.set(cacheKey, account, CacheService.TTL.ACCOUNT_TOKEN);
      }
    }

    if (!account) {
      return res.status(403).json({ error: 'Invalid account token' });
    }

    // Check if account is active
    if (account.status === Account.STATUS.BLOCKED) {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    if (account.status === Account.STATUS.INACTIVE) {
      return res.status(403).json({ error: 'Account is not activated yet' });
    }

    req.account = account;
    next();
  } catch (error) {
    next(error);
  }
}

// Account token middleware (allows inactive accounts - for /me polling)
async function requireAccountTokenAllowInactive(req, res, next) {
  try {
    var token = req.headers['x-account-token'] || req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'Account token required' });
    }

    var cacheKey = CacheService.keys.accountToken(token),
      account = await CacheService.get(cacheKey);

    if (!account) {
      account = await Account.findOne({ where: { token } });
      if (account) {
        await CacheService.set(cacheKey, account, CacheService.TTL.ACCOUNT_TOKEN);
      }
    }

    if (!account) {
      return res.status(403).json({ error: 'Invalid account token' });
    }

    // Only block if explicitly blocked, allow inactive for polling
    if (account.status === Account.STATUS.BLOCKED) {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    req.account = account;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAdminToken,
  requireAccountToken,
  requireAccountTokenAllowInactive
};

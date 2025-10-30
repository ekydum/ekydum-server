var { Account } = require('../models');

// Admin token middleware
function requireAdminToken(req, res, next) {
  var token = req.headers['x-admin-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Admin token required' });
  }
  
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Invalid admin token' });
  }
  
  next();
}

// Account token middleware
async function requireAccountToken(req, res, next) {
  var token = req.headers['x-account-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Account token required' });
  }
  
  try {
    var account = await Account.findOne({ where: { token: token } });
    
    if (!account) {
      return res.status(403).json({ error: 'Invalid account token' });
    }
    
    req.account = account;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAdminToken,
  requireAccountToken
};

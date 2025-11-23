var { Account } = require('../models');
var Joi = require('joi');
var CacheService = require('../services/cache-service');

var AdminController = {
  // Create account
  createAccount: async function(req, res, next) {
    try {
      var schema = Joi.object({
        name: Joi.string().required().min(1).max(255),
        status: Joi.number().integer().valid(1, 2, 3).optional()
      });

      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }

      var account = await Account.create({
        name: value.name,
        status: value.status || Account.STATUS.ACTIVE
      });

      res.status(201).json({
        id: account.id,
        name: account.name,
        token: account.token,
        status: account.status,
        created_at: account.created_at
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all accounts
  getAllAccounts: async function(req, res, next) {
    try {
      var accounts = await Account.findAll({
        attributes: ['id', 'name', 'token', 'status', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']]
      });

      res.json({ accounts: accounts });
    } catch (err) {
      next(err);
    }
  },

  // Get account by ID
  getAccountById: async function(req, res, next) {
    try {
      var account = await Account.findByPk(req.params.id, {
        attributes: ['id', 'name', 'token', 'status', 'created_at', 'updated_at']
      });

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json(account);
    } catch (err) {
      next(err);
    }
  },

  // Update account
  updateAccount: async function(req, res, next) {
    try {
      var schema = Joi.object({
        name: Joi.string().min(1).max(255).optional(),
        status: Joi.number().integer().valid(1, 2, 3).optional()
      });

      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }

      var account = await Account.findByPk(req.params.id);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (value.name) {
        account.name = value.name;
      }

      if (value.status) {
        account.status = value.status;
      }

      await account.save();

      // Clear cache when status changes
      await CacheService.del(CacheService.keys.accountToken(account.token));

      res.json({
        id: account.id,
        name: account.name,
        token: account.token,
        status: account.status,
        updated_at: account.updated_at
      });
    } catch (err) {
      next(err);
    }
  },

  // Delete account
  deleteAccount: async function(req, res, next) {
    try {
      var account = await Account.findByPk(req.params.id);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Clear cache
      await CacheService.del(CacheService.keys.accountToken(account.token));

      await account.destroy();

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  approveAccount: async function(req, res, next) {
    try {
      var account = await Account.findByPk(req.params.id);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      account.status = Account.STATUS.ACTIVE;
      await account.save();

      // Clear cache to force refresh
      await CacheService.del(CacheService.keys.accountToken(account.token));

      res.json({
        success: true,
        account: {
          id: account.id,
          name: account.name,
          status: account.status
        }
      });
    } catch (err) {
      next(err);
    }
  },

  blockAccount: async function(req, res, next) {
    try {
      var account = await Account.findByPk(req.params.id);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      account.status = Account.STATUS.BLOCKED;
      await account.save();

      // Clear cache to force refresh
      await CacheService.del(CacheService.keys.accountToken(account.token));

      res.json({
        success: true,
        account: {
          id: account.id,
          name: account.name,
          status: account.status
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // Get all pending login requests
  getAllLoginRequests: async function(req, res, next) {
    try {
      // Get all login request keys
      var keys = await CacheService.getKeys('login_request:*');

      var requests = [];
      for (var key of keys) {
        var request = await CacheService.get(key);
        if (request && request.status === 'pending') {
          requests.push({
            request_id: request.request_id,
            account_name: request.account_name,
            account_id: request.account_id,
            timestamp: request.timestamp,
            elapsed_seconds: Math.floor((Date.now() - request.timestamp) / 1000)
          });
        }
      }

      // Sort by timestamp (newest first)
      requests.sort((a, b) => b.timestamp - a.timestamp);

      res.json({ requests: requests });
    } catch (err) {
      next(err);
    }
  },

  // Approve login request
  approveLoginRequest: async function(req, res, next) {
    try {
      var requestId = req.params.request_id;

      var loginRequest = await CacheService.get(CacheService.keys.loginRequest(requestId));

      if (!loginRequest) {
        return res.status(404).json({ error: 'Login request not found or expired' });
      }

      if (loginRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Login request already processed' });
      }

      // Get account token
      var account = await Account.findByPk(loginRequest.account_id);

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (account.status !== Account.STATUS.ACTIVE) {
        return res.status(400).json({ error: 'Account is not active' });
      }

      // Update request status
      loginRequest.status = 'approved';
      loginRequest.token = account.token;

      await CacheService.set(
        CacheService.keys.loginRequest(requestId),
        loginRequest,
        CacheService.TTL.LOGIN_REQUEST
      );

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // Deny login request
  denyLoginRequest: async function(req, res, next) {
    try {
      var requestId = req.params.request_id;

      var loginRequest = await CacheService.get(CacheService.keys.loginRequest(requestId));

      if (!loginRequest) {
        return res.status(404).json({ error: 'Login request not found or expired' });
      }

      if (loginRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Login request already processed' });
      }

      // Update request status
      loginRequest.status = 'denied';

      await CacheService.set(
        CacheService.keys.loginRequest(requestId),
        loginRequest,
        CacheService.TTL.LOGIN_REQUEST
      );

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AdminController;

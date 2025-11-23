var { Account } = require('../models');
var Joi = require('joi');
var { v4: uuidv4 } = require('uuid');
var CacheService = require('../services/cache-service');

var QuickConnectController = {
  // Quick connect - create inactive account
  quickConnect: async function(req, res, next) {
    try {
      var schema = Joi.object({
        account_name: Joi.string()
          .required()
          .min(3)
          .max(32)
          .pattern(/^[a-z0-9]+$/)
          .messages({
            'string.pattern.base': 'Account name must contain only lowercase letters and numbers'
          })
      });

      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }

      // Check if account name already exists
      var existing = await Account.findOne({ where: { name: value.account_name } });
      if (existing) {
        return res.status(400).json({ error: 'Account name already exists' });
      }

      // Create account with inactive status
      var account = await Account.create({
        name: value.account_name,
        status: Account.STATUS.INACTIVE
      });

      res.status(201).json({
        token: account.token,
        account: {
          id: account.id,
          name: account.name,
          status: account.status,
          created_at: account.created_at
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // Create login request for existing account
  createLoginRequest: async function(req, res, next) {
    try {
      var schema = Joi.object({
        account_name: Joi.string()
          .required()
          .min(3)
          .max(32)
          .pattern(/^[a-z0-9]+$/)
          .messages({
            'string.pattern.base': 'Account name must contain only lowercase letters and numbers'
          })
      });

      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }

      // Check if account exists and is active
      var account = await Account.findOne({ where: { name: value.account_name } });
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (account.status !== Account.STATUS.ACTIVE) {
        return res.status(400).json({ error: 'Account is not active' });
      }

      // Check number of pending requests for this account
      var accountRequestsKey = CacheService.keys.accountLoginRequests(account.id);
      var requestIds = await CacheService.get(accountRequestsKey) || [];

      // Clean up expired requests
      var validRequestIds = [];
      for (var id of requestIds) {
        var req = await CacheService.get(CacheService.keys.loginRequest(id));
        if (req) {
          validRequestIds.push(id);
        }
      }

      // Check limit (max 10 pending requests per account)
      if (validRequestIds.length >= 10) {
        return res.status(429).json({ error: 'Too many pending login requests for this account' });
      }

      // Create login request
      var requestId = uuidv4();
      var loginRequest = {
        request_id: requestId,
        account_name: account.name,
        account_id: account.id,
        status: 'pending',
        token: null,
        timestamp: Date.now(),
        expires_at: Date.now() + (86400 * 1000) // 24 hours
      };

      // Save to Redis
      await CacheService.set(
        CacheService.keys.loginRequest(requestId),
        loginRequest,
        CacheService.TTL.LOGIN_REQUEST
      );

      // Add to account's requests list
      validRequestIds.push(requestId);
      await CacheService.set(
        accountRequestsKey,
        validRequestIds,
        CacheService.TTL.LOGIN_REQUEST
      );

      res.status(201).json({
        request_id: requestId,
        account_name: account.name
      });
    } catch (err) {
      next(err);
    }
  },

  // Check login request status (for polling)
  getLoginRequestStatus: async function(req, res, next) {
    try {
      var requestId = req.params.request_id;

      var loginRequest = await CacheService.get(CacheService.keys.loginRequest(requestId));

      if (!loginRequest) {
        return res.status(404).json({ error: 'Login request not found or expired' });
      }

      res.json({
        status: loginRequest.status,
        token: loginRequest.token || undefined
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = QuickConnectController;

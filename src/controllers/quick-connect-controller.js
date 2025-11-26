var { Account } = require('../models');
var Joi = require('joi');
var { v4: uuidv4 } = require('uuid');
var CacheService = require('../services/cache-service');

var QuickConnectController = {
  _schemaQuickConnect: Joi.object({
    account_name: Joi.string()
      .required()
      .min(3)
      .max(32)
      .pattern(/^[a-z0-9]+$/)
      .messages({
        'string.pattern.base': 'Account name must contain only lowercase letters and numbers'
      })
  }),

  _schemaCreateLoginRequest: Joi.object({
    account_name: Joi.string()
      .required()
      .min(3)
      .max(32)
      .pattern(/^[a-z0-9]+$/)
      .messages({
        'string.pattern.base': 'Account name must contain only lowercase letters and numbers'
      })
  }),

  quickConnect: function () {
    return async function(req, res, next) {
      try {
        var { error, value } = QuickConnectController._schemaQuickConnect.validate(req.body);
        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var existing = await Account.findOne({ where: { name: value.account_name } });
          if (existing) {
            res.status(400).json({ error: 'Account name already exists' });
          } else {
            var account = await Account.create({
              name: value.account_name,
              status: Account.STATUS.INACTIVE
            });
            res.json({
              token: account.token,
              account: {
                id: account.id,
                name: account.name,
                status: account.status,
                created_at: account.created_at
              }
            });
          }
        }
      } catch (err) {
        next(err);
      }
    };
  },

  createLoginRequest: function () {
    return async function(req, res, next) {
      try {
        var { error, value } = QuickConnectController._schemaCreateLoginRequest.validate(req.body);
        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var account = await Account.findOne({ where: { name: value.account_name } });
          if (!account) {
            res.status(404).json({ error: 'Account not found' });
          } else if (account.status !== Account.STATUS.ACTIVE) {
            res.status(400).json({ error: 'Account is not active' });
          } else {
            var accountRequestsKey = CacheService.keys.qcAccountLoginRequests(account.id);
            var requestIds = await CacheService.get(accountRequestsKey) || [];

            var validRequestIds = [];
            for (var id of requestIds) {
              var cachedReq = await CacheService.get(CacheService.keys.qcLoginRequest(id));
              if (cachedReq) {
                validRequestIds.push(id);
              }
            }

            if (validRequestIds.length >= 10) {
              res.status(429).json({ error: 'Too many pending login requests for this account' });
            } else {
              var requestId = uuidv4();
              var loginRequest = {
                request_id: requestId,
                account_name: account.name,
                account_id: account.id,
                status: 'pending',
                token: null,
                timestamp: Date.now(),
                expires_at: Date.now() + (86400 * 1000)
              };

              await CacheService.set(
                CacheService.keys.qcLoginRequest(requestId),
                loginRequest,
                CacheService.TTL.LOGIN_REQUEST
              );

              validRequestIds.push(requestId);
              await CacheService.set(
                accountRequestsKey,
                validRequestIds,
                CacheService.TTL.LOGIN_REQUEST
              );

              res.json({
                request_id: requestId,
                account_name: account.name
              });
            }
          }
        }
      } catch (err) {
        next(err);
      }
    };
  },

  getLoginRequestStatus: function () {
    return async function(req, res, next) {
      try {
        var requestId = req.params.request_id;
        var loginRequest = await CacheService.get(CacheService.keys.qcLoginRequest(requestId));
        if (loginRequest) {
          res.json({
            status: loginRequest.status,
            token: loginRequest.token || undefined
          });
        } else {
          res.status(404).json({ error: 'Login request not found or expired' });
        }
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = QuickConnectController;

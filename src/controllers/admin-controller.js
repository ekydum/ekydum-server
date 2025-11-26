var { Account } = require('../models');
var Joi = require('joi');
var CacheService = require('../services/cache-service');

var AdminController = {
  _schemaCreateAccount: Joi.object({
    name: Joi.string().required().min(1).max(255),
    status: Joi.number().integer().valid(1, 2, 3).optional()
  }),

  _schemaUpdateAccount: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    status: Joi.number().integer().valid(1, 2, 3).optional()
  }),

  createAccount: function () {
    return async function(req, res, next) {
      try {
        var { error, value } = AdminController._schemaCreateAccount.validate(req.body);
        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var account = await Account.create({
            name: value.name,
            status: value.status || Account.STATUS.ACTIVE
          });
          res.status(201).json(account);
        }
      } catch (err) {
        next(err);
      }
    };
  },

  getAllAccounts: function () {
    return async function(req, res, next) {
      try {
        var accounts = await Account.findAll({
          attributes: ['id', 'name', 'token', 'status', 'created_at', 'updated_at'],
          order: [['created_at', 'DESC']]
        });
        res.json({ accounts: accounts });
      } catch (err) {
        next(err);
      }
    };
  },

  getAccountById: function () {
    return async function(req, res, next) {
      try {
        var account = await Account.findByPk(req.params.id, {
          attributes: ['id', 'name', 'token', 'status', 'created_at', 'updated_at']
        });
        if (account) {
          res.json(account);
        } else {
          res.status(404).json({ error: 'Account not found' });
        }
      } catch (err) {
        next(err);
      }
    };
  },

  updateAccount: function () {
    return async function(req, res, next) {
      try {
        var { error, value } = AdminController._schemaUpdateAccount.validate(req.body);
        if (error) {
          error.isJoi = true;
          next(error);
        } else {
          var account = await Account.findByPk(req.params.id);
          if (account) {
            if (value.name) {
              account.name = value.name;
            }
            if (value.status) {
              account.status = value.status;
            }
            await account.save();
            await CacheService.del(CacheService.keys.authAccountToken(account.token));
            res.json(account);
          } else {
            res.status(404).json({ error: 'Account not found' });
          }
        }
      } catch (err) {
        next(err);
      }
    };
  },

  deleteAccount: function () {
    return async function(req, res, next) {
      try {
        var account = await Account.findByPk(req.params.id);
        if (account) {
          await CacheService.del(CacheService.keys.authAccountToken(account.token));
          await account.destroy();
          res.status(204).send();
        } else {
          res.status(404).json({ error: 'Account not found' });
        }
      } catch (err) {
        next(err);
      }
    }
  },

  approveAccount: function () {
    return async function(req, res, next) {
      try {
        var account = await Account.findByPk(req.params.id);
        if (account) {
          account.status = Account.STATUS.ACTIVE;
          await account.save();
          await CacheService.del(CacheService.keys.authAccountToken(account.token));
          res.json({
            success: true,
            account: {
              id: account.id,
              name: account.name,
              status: account.status
            }
          });
        } else {
          res.status(404).json({ error: 'Account not found' });
        }
      } catch (err) {
        next(err);
      }
    };
  },

  blockAccount: function () {
    return async function(req, res, next) {
      try {
        var account = await Account.findByPk(req.params.id);
        if (account) {
          account.status = Account.STATUS.BLOCKED;
          await account.save();
          await CacheService.del(CacheService.keys.authAccountToken(account.token));
          res.json({
            success: true,
            account: {
              id: account.id,
              name: account.name,
              status: account.status
            }
          });
        } else {
          res.status(404).json({ error: 'Account not found' });
        }
      } catch (err) {
        next(err);
      }
    };
  },

  getAllLoginRequests: function () {
    return async function(req, res, next) {
      try {
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
        requests.sort(function(a, b) {
          return b.timestamp - a.timestamp;
        });
        res.json({ requests: requests });
      } catch (err) {
        next(err);
      }
    };
  },

  approveLoginRequest: function () {
    return async function(req, res, next) {
      try {
        var requestId = req.params.request_id;
        var loginRequest = await CacheService.get(CacheService.keys.qcLoginRequest(requestId));

        if (!loginRequest) {
          res.status(404).json({ error: 'Login request not found or expired' });
        } else if (loginRequest.status !== 'pending') {
          res.status(400).json({ error: 'Login request already processed' });
        } else {
          var account = await Account.findByPk(loginRequest.account_id);

          if (!account) {
            res.status(404).json({ error: 'Account not found' });
          } else if (account.status !== Account.STATUS.ACTIVE) {
            res.status(400).json({ error: 'Account is not active' });
          } else {
            loginRequest.status = 'approved';
            loginRequest.token = account.token;

            await CacheService.set(
              CacheService.keys.qcLoginRequest(requestId),
              loginRequest,
              CacheService.TTL.LOGIN_REQUEST
            );

            res.json({ success: true });
          }
        }
      } catch (err) {
        next(err);
      }
    };
  },

  denyLoginRequest: function () {
    return async function(req, res, next) {
      try {
        var requestId = req.params.request_id;
        var loginRequest = await CacheService.get(CacheService.keys.qcLoginRequest(requestId));

        if (!loginRequest) {
          res.status(404).json({ error: 'Login request not found or expired' });
        } else if (loginRequest.status !== 'pending') {
          res.status(400).json({ error: 'Login request already processed' });
        } else {
          loginRequest.status = 'denied';

          await CacheService.set(
            CacheService.keys.qcLoginRequest(requestId),
            loginRequest,
            CacheService.TTL.LOGIN_REQUEST
          );

          res.json({ success: true });
        }
      } catch (err) {
        next(err);
      }
    };
  },
};

module.exports = AdminController;

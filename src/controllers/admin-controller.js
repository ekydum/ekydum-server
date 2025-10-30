var { Account } = require('../models');
var Joi = require('joi');

var AdminController = {
  // Create account
  createAccount: async function(req, res, next) {
    try {
      var schema = Joi.object({
        name: Joi.string().required().min(1).max(255)
      });
      
      var { error, value } = schema.validate(req.body);
      if (error) {
        error.isJoi = true;
        return next(error);
      }
      
      var account = await Account.create({
        name: value.name
      });
      
      res.status(201).json({
        id: account.id,
        name: account.name,
        token: account.token,
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
        attributes: ['id', 'name', 'token', 'created_at', 'updated_at'],
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
        attributes: ['id', 'name', 'token', 'created_at', 'updated_at']
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
        name: Joi.string().min(1).max(255)
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
      
      await account.save();
      
      res.json({
        id: account.id,
        name: account.name,
        token: account.token,
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
      
      await account.destroy();
      
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AdminController;

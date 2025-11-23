var { Account } = require('../models');
var Joi = require('joi');

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
  }
};

module.exports = QuickConnectController;

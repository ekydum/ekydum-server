var { DataTypes } = require('sequelize');
var sequelize = require('../config/database');
var { v4: uuidv4 } = require('uuid');

var Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  channel_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'saved_channels',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['account_id', 'channel_id']
    }
  ]
});

module.exports = Subscription;

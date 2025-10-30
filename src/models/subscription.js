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
  yt_channel_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yt_channel_name: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['account_id', 'yt_channel_id']
    }
  ]
});

module.exports = Subscription;

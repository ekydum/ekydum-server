var { DataTypes } = require('sequelize');
var sequelize = require('../config/database');
var { v4: uuidv4 } = require('uuid');

var SavedChannel = sequelize.define('SavedChannel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true
  },
  yt_channel_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'saved_channels',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['yt_channel_id']
    }
  ]
});

module.exports = SavedChannel;

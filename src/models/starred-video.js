var { DataTypes } = require('sequelize');
var sequelize = require('../config/database');
var { v4: uuidv4 } = require('uuid');

var StarredVideo = sequelize.define('StarredVideo', {
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
  video_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'saved_videos',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'starred_videos',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['account_id', 'video_id']
    },
    {
      fields: ['account_id', 'created_at']
    }
  ]
});

module.exports = StarredVideo;

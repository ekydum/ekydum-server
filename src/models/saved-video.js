var { DataTypes } = require('sequelize');
var sequelize = require('../config/database');
var { v4: uuidv4 } = require('uuid');

var SavedVideo = sequelize.define('SavedVideo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true
  },
  yt_video_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lang: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'en'
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  thumbnail: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  channel_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'saved_channels',
      key: 'id'
    }
  }
}, {
  tableName: 'saved_videos',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['yt_video_id', 'lang']
    },
    {
      fields: ['channel_id']
    },
    {
      fields: ['lang']
    },
    {
      fields: ['channel_id', 'created_at']
    }
  ]
});

module.exports = SavedVideo;

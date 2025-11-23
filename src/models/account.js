var { DataTypes } = require('sequelize');
var sequelize = require('../config/database');
var { v4: uuidv4 } = require('uuid');

var Account = sequelize.define('Account', {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    defaultValue: uuidv4
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    validate: {
      isIn: [[1, 2, 3]]
    }
  }
}, {
  tableName: 'accounts',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['status']
    }
  ]
});

Account.STATUS = {
  INACTIVE: 1,
  ACTIVE: 2,
  BLOCKED: 3
};

module.exports = Account;

var { Sequelize } = require('sequelize');

var config = {
  url: process.env.DATABASE_URL,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

var sequelize = new Sequelize(config.url, config);

// Export for sequelize-cli
module.exports = sequelize;
module.exports.config = config;

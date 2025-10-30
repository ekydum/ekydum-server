var sequelize = require('../config/database');
var Account = require('./account');
var Subscription = require('./subscription');
var Setting = require('./setting');
var { Umzug, SequelizeStorage } = require('umzug');
var path = require('path');

// Define relationships
Account.hasMany(Subscription, { foreignKey: 'account_id', onDelete: 'CASCADE' });
Subscription.belongsTo(Account, { foreignKey: 'account_id' });

Account.hasMany(Setting, { foreignKey: 'account_id', onDelete: 'CASCADE' });
Setting.belongsTo(Account, { foreignKey: 'account_id' });

// Auto-sync function (runs migrations)
async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    // Run migrations using umzug
    var umzug = new Umzug({
      migrations: {
        glob: path.join(__dirname, '../migrations/*.js')
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: console
    });

    var migrations = await umzug.up();
    console.log('Migrations executed:', migrations.length);
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  Account,
  Subscription,
  Setting,
  syncDatabase
};

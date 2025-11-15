var sequelize = require('../config/database');
var Account = require('./account');
var Subscription = require('./subscription');
var Setting = require('./setting');
var SavedChannel = require('./saved-channel');
var SavedVideo = require('./saved-video');
var StarredVideo = require('./starred-video');
var { Umzug, SequelizeStorage } = require('umzug');
var path = require('path');

// Define relationships
Account.hasMany(Subscription, { foreignKey: 'account_id', onDelete: 'CASCADE' });
Subscription.belongsTo(Account, { foreignKey: 'account_id' });

Account.hasMany(Setting, { foreignKey: 'account_id', onDelete: 'CASCADE' });
Setting.belongsTo(Account, { foreignKey: 'account_id' });

SavedChannel.hasMany(SavedVideo, { foreignKey: 'channel_id', as: 'videos' });
SavedVideo.belongsTo(SavedChannel, { foreignKey: 'channel_id', as: 'channel' });
Subscription.belongsTo(SavedChannel, { foreignKey: 'channel_id', as: 'channel' });
SavedChannel.hasMany(Subscription, { foreignKey: 'channel_id', as: 'subscriptions' });
StarredVideo.belongsTo(SavedVideo, { foreignKey: 'video_id', as: 'video' });
SavedVideo.hasMany(StarredVideo, { foreignKey: 'video_id', as: 'starred' });

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
  SavedChannel,
  SavedVideo,
  StarredVideo,
  syncDatabase
};

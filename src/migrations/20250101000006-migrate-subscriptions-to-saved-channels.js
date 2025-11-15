'use strict';

module.exports = {
  async up({ context: queryInterface }) {
    var Sequelize = queryInterface.sequelize.Sequelize;

    await queryInterface.addColumn('subscriptions', 'channel_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'saved_channels',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    var [subscriptions] = await queryInterface.sequelize.query(
      'SELECT id, yt_channel_id, yt_channel_name FROM subscriptions WHERE yt_channel_id IS NOT NULL'
    );

    for (var sub of subscriptions) {
      var [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM saved_channels WHERE yt_channel_id = ?',
        { replacements: [sub.yt_channel_id] }
      );

      var channelId;
      if (existing.length > 0) {
        channelId = existing[0].id;
      } else {
        var [result] = await queryInterface.sequelize.query(
          `INSERT INTO saved_channels (id, yt_channel_id, name, created_at, updated_at) 
           VALUES (gen_random_uuid(), ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING id`,
          { replacements: [sub.yt_channel_id, sub.yt_channel_name || 'Unknown'] }
        );
        channelId = result[0].id;
      }

      await queryInterface.sequelize.query(
        'UPDATE subscriptions SET channel_id = ? WHERE id = ?',
        { replacements: [channelId, sub.id] }
      );
    }

    await queryInterface.changeColumn('subscriptions', 'channel_id', {
      type: Sequelize.UUID,
      allowNull: false
    });

    await queryInterface.removeColumn('subscriptions', 'yt_channel_id');
    await queryInterface.removeColumn('subscriptions', 'yt_channel_name');

    await queryInterface.addIndex('subscriptions', ['account_id', 'channel_id'], {
      unique: true,
      name: 'subscriptions_account_channel_unique_new'
    });
  },

  async down({ context: queryInterface }) {
    var Sequelize = queryInterface.sequelize.Sequelize;

    await queryInterface.addColumn('subscriptions', 'yt_channel_id', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('subscriptions', 'yt_channel_name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.removeIndex('subscriptions', 'subscriptions_account_channel_unique_new');
    await queryInterface.removeColumn('subscriptions', 'channel_id');
  }
};

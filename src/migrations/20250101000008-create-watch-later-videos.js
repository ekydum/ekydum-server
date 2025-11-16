'use strict';

module.exports = {
  async up({ context: queryInterface }) {
    var Sequelize = queryInterface.sequelize.Sequelize;

    await queryInterface.createTable('watch_later_videos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      account_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'accounts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      video_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'saved_videos',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('watch_later_videos', ['account_id', 'video_id'], {
      unique: true,
      name: 'watch_later_videos_account_video_unique'
    });

    await queryInterface.addIndex('watch_later_videos', ['account_id', 'created_at'], {
      name: 'watch_later_videos_account_created_idx'
    });
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable('watch_later_videos');
  }
};

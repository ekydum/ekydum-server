'use strict';

module.exports = {
  async up({ context: queryInterface }) {
    var Sequelize = queryInterface.sequelize.Sequelize;

    await queryInterface.createTable('saved_videos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      yt_video_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      thumbnail: {
        type: Sequelize.STRING(1000),
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      channel_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'saved_channels',
          key: 'id'
        },
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('saved_videos', ['yt_video_id'], {
      unique: true,
      name: 'saved_videos_yt_video_id_unique'
    });

    await queryInterface.addIndex('saved_videos', ['channel_id'], {
      name: 'saved_videos_channel_id_idx'
    });
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable('saved_videos');
  }
};

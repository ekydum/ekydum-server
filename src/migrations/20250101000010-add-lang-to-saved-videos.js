'use strict';

module.exports = {
  async up({ context: queryInterface }) {
    var Sequelize = queryInterface.sequelize.Sequelize;

    // 1. Add lang column
    await queryInterface.addColumn('saved_videos', 'lang', {
      type: Sequelize.STRING(5),
      allowNull: false,
      defaultValue: 'en'
    });

    // 2. Remove old unique index on yt_video_id only
    await queryInterface.removeIndex('saved_videos', 'saved_videos_yt_video_id_unique');

    // 3. Add new composite unique index on yt_video_id + lang
    await queryInterface.addIndex('saved_videos', ['yt_video_id', 'lang'], {
      unique: true,
      name: 'saved_videos_yt_video_id_lang_unique'
    });

    // 4. Add index on lang for faster filtering
    await queryInterface.addIndex('saved_videos', ['lang'], {
      name: 'saved_videos_lang_idx'
    });

    // 5. Add composite index for feed queries (channel_id + created_at)
    await queryInterface.addIndex('saved_videos', ['channel_id', 'created_at'], {
      name: 'saved_videos_channel_created_idx'
    });
  },

  async down({ context: queryInterface }) {
    // Remove new indexes
    await queryInterface.removeIndex('saved_videos', 'saved_videos_channel_created_idx');
    await queryInterface.removeIndex('saved_videos', 'saved_videos_lang_idx');
    await queryInterface.removeIndex('saved_videos', 'saved_videos_yt_video_id_lang_unique');

    // Restore old unique index
    await queryInterface.addIndex('saved_videos', ['yt_video_id'], {
      unique: true,
      name: 'saved_videos_yt_video_id_unique'
    });

    // Remove lang column
    await queryInterface.removeColumn('saved_videos', 'lang');
  }
};

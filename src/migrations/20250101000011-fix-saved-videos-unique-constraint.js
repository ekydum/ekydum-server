'use strict';

module.exports = {
  async up({ context: queryInterface }) {
    var Sequelize = queryInterface.sequelize.Sequelize;

    // Check if lang column already exists (in case migration partially ran)
    var tableDesc = await queryInterface.describeTable('saved_videos');

    if (!tableDesc.lang) {
      // 1. Add lang column
      await queryInterface.addColumn('saved_videos', 'lang', {
        type: Sequelize.STRING(5),
        allowNull: false,
        defaultValue: 'en'
      });
    }

    // 2. Try to remove possible unique constraints/indexes on yt_video_id
    // Different databases create different constraint names
    var constraintsToTry = [
      'saved_videos_yt_video_id_key',
      'saved_videos_yt_video_id_unique'
    ];

    for (var constraintName of constraintsToTry) {
      try {
        await queryInterface.removeConstraint('saved_videos', constraintName);
        console.log('Removed constraint:', constraintName);
      } catch (e) {
        // Constraint doesn't exist, try as index
        try {
          await queryInterface.removeIndex('saved_videos', constraintName);
          console.log('Removed index:', constraintName);
        } catch (e2) {
          console.log('Constraint/index not found:', constraintName);
        }
      }
    }

    // 3. Add new composite unique index (if not exists)
    try {
      await queryInterface.addIndex('saved_videos', ['yt_video_id', 'lang'], {
        unique: true,
        name: 'saved_videos_yt_video_id_lang_unique'
      });
      console.log('Added composite unique index');
    } catch (e) {
      console.log('Composite unique index already exists');
    }

    // 4. Add index on lang (if not exists)
    try {
      await queryInterface.addIndex('saved_videos', ['lang'], {
        name: 'saved_videos_lang_idx'
      });
      console.log('Added lang index');
    } catch (e) {
      console.log('Lang index already exists');
    }

    // 5. Add composite index for feed queries (if not exists)
    try {
      await queryInterface.addIndex('saved_videos', ['channel_id', 'created_at'], {
        name: 'saved_videos_channel_created_idx'
      });
      console.log('Added channel_created index');
    } catch (e) {
      console.log('Channel_created index already exists');
    }
  },

  async down({ context: queryInterface }) {
    // This migration is a fix, down just removes what we added
    try {
      await queryInterface.removeIndex('saved_videos', 'saved_videos_channel_created_idx');
    } catch (e) {}

    try {
      await queryInterface.removeIndex('saved_videos', 'saved_videos_lang_idx');
    } catch (e) {}

    try {
      await queryInterface.removeIndex('saved_videos', 'saved_videos_yt_video_id_lang_unique');
    } catch (e) {}

    // Restore original unique constraint
    try {
      await queryInterface.addIndex('saved_videos', ['yt_video_id'], {
        unique: true,
        name: 'saved_videos_yt_video_id_unique'
      });
    } catch (e) {}

    // Remove lang column
    try {
      await queryInterface.removeColumn('saved_videos', 'lang');
    } catch (e) {}
  }
};

var cron = require('node-cron');
var { Op } = require('sequelize');
var { SavedVideo, StarredVideo, WatchLaterVideo } = require('../models');
var { ORPHAN_VIDEOS_TTL_DAYS } = require('../config/constants');

var CleanupService = {
  // Configuration
  _CRON_INTERVAL: '0 3 * * *', // Every day at 3:00 AM
  _cronTask: null,

  /**
   * Start the cron job for cleanup
   */
  startCron: function () {
    if (CleanupService._cronTask) {
      console.log('[CleanupService] Cron already running');
      return;
    }

    console.log('[CleanupService] Starting cron with interval:', CleanupService._CRON_INTERVAL);

    CleanupService._cronTask = cron.schedule(CleanupService._CRON_INTERVAL, function () {
      console.log('[CleanupService] Cron triggered at', new Date().toISOString());
      CleanupService.cleanupOrphanVideos().catch(function (err) {
        console.error('[CleanupService] Cron error:', err);
      });
    });

    // Run immediately on start
    CleanupService.cleanupOrphanVideos().catch(function (err) {
      console.error('[CleanupService] Initial cleanup error:', err);
    });
  },

  /**
   * Stop the cron job
   */
  stopCron: function () {
    if (CleanupService._cronTask) {
      CleanupService._cronTask.stop();
      CleanupService._cronTask = null;
      console.log('[CleanupService] Cron stopped');
    }
  },

  /**
   * Delete orphan SavedVideos older than TTL
   * @returns {Promise<number>} Number of deleted records
   */
  cleanupOrphanVideos: async function () {
    console.log('[CleanupService] Starting orphan videos cleanup');

    var ttlDate = new Date();
    ttlDate.setDate(ttlDate.getDate() - ORPHAN_VIDEOS_TTL_DAYS);

    var sequelize = SavedVideo.sequelize;

    // Delete orphan videos using SQL subquery (memory efficient)
    var deletedCount = await SavedVideo.destroy({
      where: {
        created_at: { [Op.lt]: ttlDate },
        id: {
          [Op.notIn]: sequelize.literal(`(
            SELECT video_id FROM starred_videos
            UNION
            SELECT video_id FROM watch_later_videos
          )`)
        }
      }
    });

    console.log('[CleanupService] Deleted', deletedCount, 'orphan videos older than', ORPHAN_VIDEOS_TTL_DAYS, 'days');

    return deletedCount;
  },
};

module.exports = CleanupService;

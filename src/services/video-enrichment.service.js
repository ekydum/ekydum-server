var SavedVideo = require('../models/saved-video');
var WatchLaterVideo = require('../models/watch-later-video');
var StarredVideo = require('../models/starred-video');
var { Op } = require('sequelize');

var VideoEnrichmentService = {
  /**
   * Enriches video list items with user-specific flags (isWatchLater, isStarred)
   * @param {Array} videos - Array of YtVideoListItem objects
   * @param {string} accountId - User's account ID
   * @returns {Promise<Array>} - Enriched videos array
   */
  enrichVideos: async function (videos, accountId) {
    if (!videos || videos.length === 0) {
      return videos;
    }

    var ytIds = videos.map(function (v) {
      return v.yt_id;
    }).filter(Boolean);

    if (ytIds.length === 0) {
      return videos;
    }

    try {
      // Find saved videos by yt_id to get their internal IDs
      var savedVideos = await SavedVideo.findAll({
        where: {
          yt_video_id: { [Op.in]: ytIds }
        },
        attributes: ['id', 'yt_video_id']
      });

      if (savedVideos.length === 0) {
        return VideoEnrichmentService._addEmptyFlags(videos);
      }

      var savedVideoIds = savedVideos.map(function (sv) {
        return sv.id;
      });

      var ytIdToSavedId = new Map(savedVideos.map(function (sv) {
        return [sv.yt_video_id, sv.id];
      }));

      // Batch query for watch later and starred
      var [watchLaterVideos, starredVideos] = await Promise.all([
        WatchLaterVideo.findAll({
          where: {
            account_id: accountId,
            video_id: { [Op.in]: savedVideoIds }
          },
          attributes: ['video_id']
        }),
        StarredVideo.findAll({
          where: {
            account_id: accountId,
            video_id: { [Op.in]: savedVideoIds }
          },
          attributes: ['video_id']
        })
      ]);

      var watchLaterSet = new Set(watchLaterVideos.map(function (wl) {
        return wl.video_id;
      }));

      var starredSet = new Set(starredVideos.map(function (s) {
        return s.video_id;
      }));

      return videos.map(function (video) {
        var savedId = ytIdToSavedId.get(video.yt_id);
        return Object.assign({}, video, {
          is_watch_later: savedId ? watchLaterSet.has(savedId) : false,
          is_starred: savedId ? starredSet.has(savedId) : false
        });
      });

    } catch (error) {
      console.error('[VideoEnrichmentService] Error enriching videos:', error);
      return VideoEnrichmentService._addEmptyFlags(videos);
    }
  },

  /**
   * Add empty flags to videos (fallback)
   * @param {Array} videos
   * @returns {Array}
   * @private
   */
  _addEmptyFlags: function (videos) {
    return videos.map(function (v) {
      return Object.assign({}, v, {
        is_watch_later: false,
        is_starred: false
      });
    });
  }
};

module.exports = VideoEnrichmentService;

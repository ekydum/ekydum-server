module.exports = {
  // Fixed page size for all paginated requests
  // Ensures cache keys consistency across different requests
  GLOBAL_PAGE_SIZE: 50,

  // Concurrency limit for any parallel requests
  GLOBAL_CONCURRENCY: 3,

  // Days to keep orphan SavedVideos (not linked to Starred or WatchLater)
  ORPHAN_VIDEOS_TTL_DAYS: 30,
};

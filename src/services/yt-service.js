var CacheService = require('./cache-service');
var { spawn } = require("child_process");
var { ClientSettingsHelper } = require('../helpers/client-settings.helper');

// TODO: rewrite all methods requiring accountId, use lang instead.

var YtService = {
  _YT_BASE_URL: 'https://www.youtube.com',

  /**
   * @param { string } query
   * @param { string } accountId
   * @returns { Promise<YtChannelListItem[]> }
   */
  searchChannels: async function(query, accountId) {
    return YtService._localize(
      accountId,
      async (lang) => (
        async (cacheKey) => YtService._cacheProxy(
          cacheKey,
          CacheService.TTL.CHANNEL_SEARCH,
          async () => YtService._ytQuery(
            [
              '--dump-json',
              '--flat-playlist',
              '--playlist-end', '10',
              '--extractor-args', 'youtube:lang=' + lang,
              'ytsearch10:' + query
            ],
            (item) => !!item.channel_id,
            (item) => YtService._mapChannelListItem(item)
          ).then(
            (items) => YtService._getUniqueChannelListItems(items)
          )
        )
      )(
        CacheService.keys.ytChannelSearch(query, lang)
      )
    );
  },

  /**
   * @param { string } query
   * @param { number } offset
   * @param { number } limit
   * @param { string } accountId
   * @returns { Promise<YtVideoListItem[]> }
   */
  searchVideos: async function(query, offset, limit, accountId) {
    return YtService._localize(
      accountId,
      async (lang) => (
        async (offsetVal, limitVal) => (
          async (playlistStart, playlistEnd) => YtService._ytQuery(
            [
              '--dump-json',
              '--flat-playlist',
              '--playlist-start', playlistStart.toString(),
              '--playlist-end', playlistEnd.toString(),
              '--extractor-args', 'youtube:lang=' + lang,
              'ytsearch' + playlistEnd + ':' + query
            ],
            // get rid of non-video items like channels
            (item) => (typeof item.duration === 'number' && item.duration > 0), // item.ie_key === 'Youtube', (undocumented)
            (item) => YtService._mapVideoListItem(item)
          )
        )(
          (offsetVal + 1),
          (offsetVal + limitVal)
        )
      )(
        (offset || 0),
        (limit || 20)
      )
    );
  },

  /**
   * @param { string } ytChannelId
   * @param { string } accountId
   * @returns { Promise<YtChannel> }
   */
  getChannelInfo: async function(ytChannelId, accountId) {
    return YtService._localize(
      accountId,
      async (lang) => (
        async (cacheKey) => YtService._cacheProxy(
          cacheKey,
          CacheService.TTL.CHANNEL_INFO,
          async () => YtService.__tap(
            (await YtService._ytQuery(
              [
                '--dump-json',
                '--playlist-end', '1',
                '--extractor-args', 'youtube:lang=' + lang,
                this._YT_BASE_URL + '/channel/' + ytChannelId
              ],
              (item) => !!item,
              (item) => YtService._mapChannel(item, ytChannelId)
            ))[0],
            (ch) => { if (!ch) { throw new Error('Channel not found'); } }
          )
        )
      )(
        CacheService.keys.ytChannelInfo(ytChannelId, lang)
      )
    );
  },

  /**
   * @param { string } ytChannelId
   * @param { number } page
   * @param { number } pageSize
   * @param { string } accountId
   * @returns { Promise<{ items: YtVideoListItem[]; pagination: PaginationObject; }> }
   */
  getChannelVideos: async function(ytChannelId, page, pageSize, accountId) {
    return YtService._localize(
      accountId,
      async (lang) => (
        async (cacheKey) => YtService._cacheProxy(
          cacheKey,
          CacheService.TTL.CHANNEL_VIDEOS,
          async () => YtService._paginatedResponse(
            await YtService._ytQuery(
              [
                '--dump-json',
                '--flat-playlist',
                '--playlist-start', ((page - 1) * pageSize + 1).toString(),
                '--playlist-end', (page * pageSize).toString(),
                '--extractor-args', 'youtube:lang=' + lang,
                this._YT_BASE_URL + '/channel/' + ytChannelId + '/videos'
              ],
              (item) => !!item,
              (item) => YtService._mapVideoListItem(item)
            ),
            page,
            pageSize
          )
        )
      )(
        CacheService.keys.ytChannelVideos(ytChannelId, page, pageSize, lang)
      )
    );
  },

  /**
   * TODO: This is a quick workaround to get a method accepting lang instead of accountID, the service needs to be rewritten.
   * @param { string } ytChannelId
   * @param { number } page
   * @param { number } pageSize
   * @param { string } lang
   * @returns { Promise<{ items: YtVideoListItem[]; pagination: PaginationObject; }> }
   */
  getChannelVideos2: async function(ytChannelId, page, pageSize, lang) {
    return YtService._cacheProxy(
      CacheService.keys.ytChannelVideos(ytChannelId, page, pageSize, lang),
      CacheService.TTL.CHANNEL_VIDEOS,
      async () => YtService._paginatedResponse(
        await YtService._ytQuery(
          [
            '--dump-json',
            '--flat-playlist',
            '--playlist-start', ((page - 1) * pageSize + 1).toString(),
            '--playlist-end', (page * pageSize).toString(),
            '--extractor-args', 'youtube:lang=' + lang,
            this._YT_BASE_URL + '/channel/' + ytChannelId + '/videos'
          ],
          (item) => !!item,
          (item) => YtService._mapVideoListItem(item)
        ),
        page,
        pageSize
      )
    );
  },

  /**
   * @param { string } ytChannelId
   * @param { string } accountId
   * @returns { Promise<YtPlaylist[]> }
   */
  getChannelPlaylists: async function(ytChannelId, accountId) {
    return YtService._localize(
      accountId,
      async (lang) => (
        async (cacheKey) => YtService._cacheProxy(
          cacheKey,
          CacheService.TTL.CHANNEL_PLAYLISTS,
          async () => YtService._ytQuery(
            [
              '--dump-json',
              '--flat-playlist',
              '--extractor-args', 'youtube:lang=' + lang,
              this._YT_BASE_URL + '/channel/' + ytChannelId + '/playlists'
            ],
            (item) => !!item,
            (item) => YtService._mapPlaylist(item)
          )
        )
      )(
        CacheService.keys.ytChannelPlaylists(ytChannelId, lang)
      )
    );
  },

  /**
   * @param { string } ytPlaylistId
   * @param { number } page
   * @param { number } pageSize
   * @param { string } accountId
   * @returns { Promise< { items: YtVideoListItem[], pagination: PaginationObject }> }
   */
  getPlaylistVideos: async function(ytPlaylistId, page, pageSize, accountId) {
    return YtService._localize(
      accountId,
      async (lang) => (
        async (cacheKey) => YtService._cacheProxy(
          cacheKey,
          CacheService.TTL.CHANNEL_PLAYLIST_VIDEOS,
          async () => YtService._paginatedResponse(
            await YtService._ytQuery(
              [
                '--dump-json',
                '--flat-playlist',
                '--playlist-start', ((page - 1) * pageSize + 1).toString(),
                '--playlist-end', (page * pageSize).toString(),
                '--extractor-args', 'youtube:lang=' + lang,
                YtService._YT_BASE_URL + '/playlist?list=' + ytPlaylistId
              ],
              (item) => !!item,
              (item) => YtService._mapVideoListItem(item)
            ),
            page,
            pageSize
          )
        )
      )(
        CacheService.keys.ytChannelPlaylistVideos(ytPlaylistId, page, pageSize, lang)
      )
    );
  },

  /**
   * @param { string } ytVideoId
   * @param { string } accountId
   * @returns { Promise<YtVideo> }
   */
  getVideoInfo: async function(ytVideoId, accountId) {
    return YtService._localize(
      accountId,
      async (lang) => (
        async (cacheKey) => YtService._cacheProxy(
          cacheKey,
          CacheService.TTL.VIDEO_INFO,
          async () => YtService.__tap(
            (await YtService._ytQuery(
              [
                '--dump-json',
                '--no-playlist',
                '--prefer-free-formats',
                '--no-check-certificate',
                '--extractor-args', 'youtube:lang=' + lang,
                YtService._YT_BASE_URL + '/watch?v=' + ytVideoId,
              ],
              (item) => !!item,
              (item) => YtService._mapVideo(item)
            ))[0],
            (d) => { if (!d?.id) { throw new Error('Video not found'); } }
          )
        )
      )(
        CacheService.keys.ytVideoInfo(ytVideoId, lang)
      )
    );
  },

  /**
   * @template T
   * @param { string[] } args
   * @param { (item: *) => boolean } filter
   * @param { (item: *) => T } mapper
   * @returns { Promise<T[]> }
   * @private
   */
  _ytQuery: async function (args, filter, mapper) {
    return YtService._parseJsonOutput(await this._executeYtDlp(args))
      .filter(filter)
      .map(mapper);
  },

  /**
   * @param { string[] } args
   * @returns { Promise<string> }
   * @private
   */
  _executeYtDlp: async function(args) {
    return YtService.__try(
      async () => (
        new Promise((resolve, reject) => {
          ((proc, stdout, stderr, rs, rj) => {
            proc.stdout.on('data', (data) => { stdout += data.toString(); });
            proc.stderr.on('data', (data) => { stderr += data.toString(); });
            proc.on('close', (code) => { (code !== 0 && stderr.includes('ERROR')) ? rj(new Error(stderr)) : rs(stdout); });
            proc.on('error', (err) => { rj(err); });
          })(
            spawn('yt-dlp', [
              '--js-runtimes', 'node',
              '--remote-components', 'ejs:github',
              ...args
            ], { maxBuffer: 10485760 }),
            '',
            '',
            resolve,
            reject
          );
        })
      ),
      (e) => (new Error('Failed to execute yt-dlp: ' + e.message))
    );
  },

  /**
   * @param { * } output
   * @returns { *[] }
   * @private
   */
  _parseJsonOutput: function(output) {
    return YtService.__trySync(
      () => output
        .trim()
        .split('\n')
        .map(
          (line) => (
            (jl) => (jl.length > 0 ? JSON.parse(jl) : null)
          )(line.trim())
        )
        .filter((item) => !!item),
      (error) => (new Error('Failed to parse yt-dlp output: ' + error.message))
    );
  },

  /**
   * @param { string } accountId
   * @returns { Promise<string> }
   * @private
   */
  _getLanguageSetting: async function(accountId) {
    return ClientSettingsHelper.getSettings(accountId)
      .then((s) => (s.LANG || 'en'))
      .catch(() =>'en');
  },

  /**
   * @param { * } item
   * @param { string } ytChannelId
   * @returns { YtChannel }
   * @private
   */
  _mapChannel: function (item, ytChannelId) {
    return ((thumbnail) => ({
      yt_id: ytChannelId,
      name: item.channel || item.uploader || 'Unknown',
      description: item.description || '',
      thumbnail,
      thumbnail_src: thumbnail,
      subscriber_count: item.channel_follower_count || 0,
      video_count: item.playlist_count || 0
    }))(
      YtService._pickThumbnail(item.thumbnails)
    );
  },

  /**
   * @param { * } item
   * @returns { YtChannelListItem }
   * @private
   */
  _mapChannelListItem: function (item) {
    return ((thumbnail) => ({
      yt_id: item.channel_id,
      name: item.channel || item.uploader || 'Unknown',
      thumbnail,
      thumbnail_src: thumbnail,
    }))(
      YtService._pickThumbnail(item.thumbnails)
    );
  },

  /**
   * @param { YtChannelListItem[] } channels
   * @returns { YtChannelListItem[] }
   * @private
   */
  _getUniqueChannelListItems: function (channels) {
    var uniqueChannels = [];
    var seenIds = {};
    channels.forEach((channel) => {
      if (!seenIds[channel.yt_id]) {
        seenIds[channel.yt_id] = true;
        uniqueChannels.push(channel);
      }
    });
    return uniqueChannels;
  },

  /**
   * @param { * } item
   * @returns { YtVideo }
   * @private
   */
  _mapVideo: function (item) {
    return ((thumbnail) => Object.assign(item, {
      thumbnail,
      thumbnail_src: thumbnail,
    }))(
      YtService._pickThumbnail(item.thumbnails)
    );
  },

  /**
   * @param { * } item
   * @returns { YtVideoListItem }
   * @private
   */
  _mapVideoListItem: function (item) {
    return ((thumbnail, uploadDate) => ({
      yt_id: item.id,
      title: item.title,
      thumbnail: thumbnail,
      thumbnail_src: thumbnail,
      duration: item.duration || 0,
      view_count: item.view_count ? (item.view_count + 'X') : '',
      upload_date: uploadDate,
      channel_id: item.channel_id || null,
      channel_name: item.channel || item.uploader || 'Unknown',
    }))(
      YtService._pickThumbnail(item.thumbnails),
      YtService._formatYtDate(item.upload_date)
    );
  },

  /**
   * @param { * } item
   * @returns { YtPlaylist }
   * @private
   */
  _mapPlaylist: function (item) {
    return ((thumbnail) => ({
      yt_id: item.id,
      title: item.title,
      description: item.description || '',
      thumbnail,
      thumbnail_src: thumbnail,
      video_count: item.playlist_count || 0,
    }))(
      YtService._pickThumbnail(item.thumbnails)
    );
  },

  /**
   * @template T
   * @param { T[] } items
   * @param { number } page
   * @param { number } pageSize
   * @returns { { items: T[], pagination: PaginationObject } }
   * @private
   */
  _paginatedResponse: function (items, page, pageSize) {
    return {
      items,
      pagination: {
        page: page,
        page_size: pageSize,
        has_next: items.length === pageSize
      },
    };
  },

  /**
   * @param { { url: string }[] } thumbnails
   * @returns { string }
   * @private
   */
  _pickThumbnail: function (thumbnails) {
    return (
      (Array.isArray(thumbnails) && (thumbnails.length > 0))
        ? thumbnails[thumbnails.length - 1].url
        : null
    );
  },

  /**
   * @param { string } dt
   * @returns { string }
   * @private
   */
  _formatYtDate: function (dt) {
    return (dt ? dt.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : null);
  },

  /**
   * @template T
   * @param { string } cacheKey
   * @param { number } cacheTtl
   * @param { () => Promise<T> } retriever
   * @returns { Promise<T> }
   * @private
   */
  _cacheProxy: async function (cacheKey, cacheTtl, retriever) {
    return (
      (await CacheService.get(cacheKey)) ||
      (await YtService.__tap(
        await retriever(),
        async (d) => CacheService.set(cacheKey, d, cacheTtl)
      ))
    );
  },

  /**
   * @template T
   * @param { string } accountId
   * @param { (lang: string) => Promise<T> } cb
   * @returns { Promise<T> }
   * @private
   */
  _localize: async function (accountId, cb) {
    return cb(await this._getLanguageSetting(accountId));
  },

  /**
   * @template T
   * @param { T } val
   * @param { (val: T) => * } cb
   * @returns { Promise<T> }
   * @private
   */
  __tap: async function (val, cb) {
    await cb(val);
    return val;
  },

  /**
   * @template T
   * @param { () => Promise<T> } cb
   * @param { (e: Error) => Error } mapErr
   * @returns { Promise<T> }
   * @private
   */
  __try: async function (cb, mapErr) {
    try {
      return (await cb());
    } catch (e) {
      throw mapErr(e);
    }
  },

  /**
   * @template T
   * @param { () => T } cb
   * @param { (e: Error) => Error } mapErr
   * @returns { T }
   * @private
   */
  __trySync: function (cb, mapErr) {
    try {
      return cb();
    } catch (e) {
      throw mapErr(e);
    }
  },
};

module.exports = YtService;

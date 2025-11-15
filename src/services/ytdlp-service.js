var CacheService = require('./cache-service');
var Setting = require('../models/setting');
const { spawn } = require("child_process");

var YtdlpService = {
  YT_BASE_URL: 'https://www.youtube.com',

  searchChannels: async function(query, accountId) {
    var lang = await this._getLanguageSetting(accountId);
    var cacheKey = CacheService.keys.channelSearch(query) + ':' + lang;
    var cached = await CacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    var results = this._parseJsonOutput(
      await this._executeYtDlp([
        '--dump-json',
        '--flat-playlist',
        '--playlist-end', '10',
        '--extractor-args', 'youtube:lang=' + lang,
        'ytsearch10:' + query
      ])
    );

    var channels = results
      .filter(function(item) {
        return item.channel_id;
      })
      .map(function(item) {
        return {
          yt_id: item.channel_id,
          name: item.channel || item.uploader || 'Unknown',
          thumbnail: item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : null
        };
      });

    var uniqueChannels = [];
    var seenIds = {};
    channels.forEach(function(channel) {
      if (!seenIds[channel.yt_id]) {
        seenIds[channel.yt_id] = true;
        uniqueChannels.push(channel);
      }
    });

    await CacheService.set(cacheKey, uniqueChannels, CacheService.TTL.CHANNEL_SEARCH);
    return uniqueChannels;
  },

  searchVideos: async function(query, offset, limit, accountId) {
    var lang = await this._getLanguageSetting(accountId);
    offset = offset || 0;
    limit = limit || 20;

    var playlistStart = offset + 1;
    var playlistEnd = offset + limit;

    var results = this._parseJsonOutput(
      await this._executeYtDlp([
        '--dump-json',
        '--flat-playlist',
        '--playlist-start', playlistStart.toString(),
        '--playlist-end', playlistEnd.toString(),
        '--extractor-args', 'youtube:lang=' + lang,
        'ytsearch' + playlistEnd + ':' + query
      ])
    );

    var videos = results.map(function(item) {
      return {
        yt_id: item.id,
        title: item.title,
        description: item.description || '',
        thumbnail: item.thumbnails && item.thumbnails.length > 0
          ? item.thumbnails[item.thumbnails.length - 1].url
          : null,
        duration: item.duration || 0,
        view_count: item.view_count || 0,
        upload_date: item.upload_date ?
          item.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') :
          null,
        channel_id: item.channel_id || null,
        channel_name: item.channel || item.uploader || 'Unknown'
      };
    });

    return videos;
  },

  getChannelInfo: async function(ytChannelId, accountId) {
    var lang = await this._getLanguageSetting(accountId);
    var cacheKey = CacheService.keys.channelInfo(ytChannelId) + ':' + lang;
    var cached = await CacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    var results = this._parseJsonOutput(
      await this._executeYtDlp([
        '--dump-json',
        '--playlist-end', '1',
        '--extractor-args', 'youtube:lang=' + lang,
        this.YT_BASE_URL + '/channel/' + ytChannelId
      ])
    );

    if (results.length === 0) {
      throw new Error('Channel not found');
    }

    var data = results[0];
    var channelInfo = {
      yt_id: ytChannelId,
      name: data.channel || data.uploader || 'Unknown',
      description: data.description || '',
      thumbnail: data.thumbnails && data.thumbnails.length > 0
        ? data.thumbnails[data.thumbnails.length - 1].url
        : null,
      subscriber_count: data.channel_follower_count || 0,
      video_count: data.playlist_count || 0
    };

    await CacheService.set(cacheKey, channelInfo, CacheService.TTL.CHANNEL_INFO);
    return channelInfo;
  },

  getChannelVideos: async function(ytChannelId, page, pageSize, accountId) {
    var lang = await this._getLanguageSetting(accountId);
    var cacheKey = CacheService.keys.channelVideos(ytChannelId, page, pageSize) + ':' + lang;
    var cached = await CacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    var results = this._parseJsonOutput(
      await this._executeYtDlp([
        '--dump-json',
        '--flat-playlist',
        '--playlist-start', ((page - 1) * pageSize + 1).toString(),
        '--playlist-end', (page * pageSize).toString(),
        '--extractor-args', 'youtube:lang=' + lang,
        this.YT_BASE_URL + '/channel/' + ytChannelId + '/videos'
      ])
    );

    var videos = results.map(function(item) {
      return {
        yt_id: item.id,
        title: item.title,
        description: item.description || '',
        thumbnail: item.thumbnails && item.thumbnails.length > 0
          ? item.thumbnails[item.thumbnails.length - 1].url
          : null,
        duration: item.duration || 0,
        view_count: item.view_count || 0,
        upload_date: item.upload_date ?
          item.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') :
          null,
        channel_id: ytChannelId,
        channel_name: item.channel || item.uploader || 'Unknown'
      };
    });

    var result = {
      items: videos,
      pagination: {
        page: page,
        page_size: pageSize,
        has_next: videos.length === pageSize
      }
    };

    await CacheService.set(cacheKey, result, CacheService.TTL.CHANNEL_VIDEOS);
    return result;
  },

  getChannelPlaylists: async function(ytChannelId, accountId) {
    var lang = await this._getLanguageSetting(accountId);
    var cacheKey = 'playlists:' + ytChannelId + ':' + lang;
    var cached = await CacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    var results = this._parseJsonOutput(
      await this._executeYtDlp([
        '--dump-json',
        '--flat-playlist',
        '--extractor-args', 'youtube:lang=' + lang,
        this.YT_BASE_URL + '/channel/' + ytChannelId + '/playlists'
      ])
    );

    var playlists = results.map(function(item) {
      return {
        yt_id: item.id,
        title: item.title,
        description: item.description || '',
        thumbnail: item.thumbnails && item.thumbnails.length > 0
          ? item.thumbnails[item.thumbnails.length - 1].url
          : null,
        video_count: item.playlist_count || 0
      };
    });

    await CacheService.set(cacheKey, playlists, CacheService.TTL.CHANNEL_INFO);
    return playlists;
  },

  getPlaylistVideos: async function(ytPlaylistId, page, pageSize, accountId) {
    var lang = await this._getLanguageSetting(accountId);
    var cacheKey = 'playlist:' + ytPlaylistId + ':' + page + ':' + pageSize + ':' + lang;
    var cached = await CacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    var results = this._parseJsonOutput(
      await this._executeYtDlp([
        '--dump-json',
        '--flat-playlist',
        '--playlist-start', ((page - 1) * pageSize + 1).toString(),
        '--playlist-end', (page * pageSize).toString(),
        '--extractor-args', 'youtube:lang=' + lang,
        this.YT_BASE_URL + '/playlist?list=' + ytPlaylistId
      ])
    );

    var videos = results.map(function(item) {
      return {
        yt_id: item.id,
        title: item.title,
        description: item.description || '',
        thumbnail: item.thumbnails && item.thumbnails.length > 0
          ? item.thumbnails[item.thumbnails.length - 1].url
          : null,
        duration: item.duration || 0,
        view_count: item.view_count || 0,
        upload_date: item.upload_date ?
          item.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') :
          null,
        channel_id: item.channel_id || null,
        channel_name: item.channel || item.uploader || 'Unknown'
      };
    });

    var result = {
      items: videos,
      pagination: {
        page: page,
        page_size: pageSize,
        has_next: videos.length === pageSize
      }
    };

    await CacheService.set(cacheKey, result, CacheService.TTL.CHANNEL_VIDEOS);
    return result;
  },

  getVideoInfo: async function(ytVideoId, accountId) {
    var lang = await this._getLanguageSetting(accountId);
    var cacheKey = CacheService.keys.videoInfo(ytVideoId) + ':' + lang;
    var cached = await CacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    var videoInfo = this._parseJsonOutput(
      await this._executeYtDlp([
        '--dump-json',
        '--no-playlist',
        '--prefer-free-formats',
        '--no-check-certificate',
        '--extractor-args', 'youtube:lang=' + lang,
        this.YT_BASE_URL + '/watch?v=' + ytVideoId,
      ])
    )?.[0];

    if (!videoInfo?.id) {
      throw new Error('Video not found');
    }

    await CacheService.set(cacheKey, videoInfo, CacheService.TTL.VIDEO_INFO);

    return videoInfo;
  },

  _executeYtDlp: async function(args) {
    try {
      return new Promise(function(resolve, reject) {
        var ytdlp = spawn('yt-dlp', args, {
          maxBuffer: 1024 * 1024 * 10
        });

        var stdout = '',
            stderr = '';

        ytdlp.stdout.on('data', function(data) {
          stdout += data.toString();
        });

        ytdlp.stderr.on('data', function(data) {
          stderr += data.toString();
        });

        ytdlp.on('close', function(code) {
          if (code !== 0 && stderr.includes('ERROR')) {
            reject(new Error(stderr));
          } else {
            resolve(stdout);
          }
        });

        ytdlp.on('error', function(error) {
          reject(new Error('Failed to execute yt-dlp: ' + error.message));
        });
      });
    } catch (error) {
      console.error('yt-dlp error:', error.message);
      throw new Error('Failed to execute yt-dlp: ' + error.message);
    }
  },

  _parseJsonOutput: function(output) {
    try {
      return output
        .trim()
        .split('\n')
        .map(function(line) {
          var jl = line.trim();
          return jl.length > 0 ? JSON.parse(jl) : null;
        })
        .filter(function (item) {
          return !!item;
        });
    } catch (error) {
      throw new Error('Failed to parse yt-dlp output: ' + error.message);
    }
  },

  _getLanguageSetting: async function(accountId) {
    if (!accountId) {
      return 'en';
    }

    try {
      var setting = await Setting.findOne({
        where: {
          account_id: accountId,
          key: 'LANG'
        }
      });

      return setting ? setting.value : 'en';
    } catch (error) {
      console.error('Failed to get LANG setting:', error.message);
      return 'en';
    }
  },
};

module.exports = YtdlpService;

var { exec } = require('child_process');
var { promisify } = require('util');
var CacheService = require('./cache-service');

var execAsync = promisify(exec);

var YtdlpService = {
  // Quality mapping for yt-dlp format selection
  QUALITY_MAP: {
    'min': 'worst',
    '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
    '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
    '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
    '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    '2k': 'bestvideo[height<=1440]+bestaudio/best[height<=1440]',
    '4k': 'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
    'max': 'best'
  },

  // Execute yt-dlp command
  executeYtDlp: async function(args) {
    try {
      var command = 'yt-dlp ' + args.join(' ');
      var { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
      
      if (stderr && stderr.includes('ERROR')) {
        throw new Error(stderr);
      }
      
      return stdout;
    } catch (error) {
      console.error('yt-dlp error:', error.message);
      throw new Error('Failed to execute yt-dlp: ' + error.message);
    }
  },

  // Parse JSON output from yt-dlp
  parseJsonOutput: function(output) {
    try {
      var lines = output.trim().split('\n');
      return lines.map(function(line) {
        return JSON.parse(line);
      });
    } catch (error) {
      throw new Error('Failed to parse yt-dlp output');
    }
  },

  // Search channels
  searchChannels: async function(query) {
    var cacheKey = CacheService.keys.channelSearch(query);
    var cached = await CacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    var args = [
      '--dump-json',
      '--flat-playlist',
      '--playlist-end', '10',
      'ytsearch10:' + query
    ];
    
    var output = await this.executeYtDlp(args);
    var results = this.parseJsonOutput(output);
    
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
    
    // Remove duplicates
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

  // Get channel info
  getChannelInfo: async function(ytChannelId) {
    var cacheKey = CacheService.keys.channelInfo(ytChannelId);
    var cached = await CacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    var channelUrl = 'https://www.youtube.com/channel/' + ytChannelId;
    var args = [
      '--dump-json',
      '--playlist-end', '1',
      channelUrl
    ];
    
    var output = await this.executeYtDlp(args);
    var results = this.parseJsonOutput(output);
    
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

  // Get channel videos
  getChannelVideos: async function(ytChannelId, page, pageSize) {
    var cacheKey = CacheService.keys.channelVideos(ytChannelId, page, pageSize);
    var cached = await CacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    var channelUrl = 'https://www.youtube.com/channel/' + ytChannelId + '/videos';
    var playlistStart = (page - 1) * pageSize + 1;
    var playlistEnd = page * pageSize;
    
    var args = [
      '--dump-json',
      '--flat-playlist',
      '--playlist-start', playlistStart.toString(),
      '--playlist-end', playlistEnd.toString(),
      channelUrl
    ];
    
    var output = await this.executeYtDlp(args);
    var results = this.parseJsonOutput(output);
    
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

  // Get video info
  getVideoInfo: async function(ytVideoId) {
    var cacheKey = CacheService.keys.videoInfo(ytVideoId);
    var cached = await CacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    var videoUrl = 'https://www.youtube.com/watch?v=' + ytVideoId;
    var args = [
      '--dump-json',
      videoUrl
    ];
    
    var output = await this.executeYtDlp(args);
    var results = this.parseJsonOutput(output);
    
    if (results.length === 0) {
      throw new Error('Video not found');
    }
    
    var data = results[0];
    var videoInfo = {
      yt_id: ytVideoId,
      title: data.title,
      description: data.description || '',
      thumbnail: data.thumbnail,
      duration: data.duration || 0,
      view_count: data.view_count || 0,
      upload_date: data.upload_date ? 
        data.upload_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : 
        null,
      channel_id: data.channel_id,
      channel_name: data.channel || data.uploader || 'Unknown'
    };
    
    await CacheService.set(cacheKey, videoInfo, CacheService.TTL.VIDEO_INFO);
    return videoInfo;
  },

  // Get video stream URL
  getVideoStreamUrl: async function(ytVideoId, quality) {
    var cacheKey = CacheService.keys.videoUrl(ytVideoId, quality);
    var cached = await CacheService.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    var videoUrl = 'https://www.youtube.com/watch?v=' + ytVideoId;
    var format = this.QUALITY_MAP[quality] || this.QUALITY_MAP['720p'];
    
    var args = [
      '-f', format,
      '-g',
      videoUrl
    ];
    
    var output = await this.executeYtDlp(args);
    var url = output.trim().split('\n')[0];
    
    var result = {
      url: url,
      quality: quality,
      expires_at: Math.floor(Date.now() / 1000) + CacheService.TTL.VIDEO_URL
    };
    
    await CacheService.set(cacheKey, result, CacheService.TTL.VIDEO_URL);
    return result;
  }
};

module.exports = YtdlpService;

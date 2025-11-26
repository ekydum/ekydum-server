export interface YtVideo_Format_Fragment {
  /** Fragment URL */
  url: string;

  /** Fragment duration in seconds */
  duration?: number;
}

export interface YtVideo_Format {
  /** Format identifier */
  format_id: string;

  /** Human-readable format description */
  format_note?: string;

  /** File extension */
  ext: string;

  /** Protocol used for download (https, m3u8_native, etc.) */
  protocol: string;

  /** Audio codec (opus, aac, mp4a, etc.) or 'none' */
  acodec: string | null;

  /** Video codec (h264, vp9, av01, etc.) or 'none' */
  vcodec: string | null;

  /** Direct URL to the stream */
  url: string;

  /** Video width in pixels */
  width?: number | null;

  /** Video height in pixels */
  height?: number | null;

  /** Frames per second */
  fps?: number | null;

  /** Number of rows (for storyboard formats) */
  rows?: number;

  /** Number of columns (for storyboard formats) */
  columns?: number;

  /** HLS/DASH fragments */
  fragments?: YtVideo_Format_Fragment[];

  /** Audio file extension */
  audio_ext: string;

  /** Video file extension */
  video_ext: string;

  /** Video bitrate in kbps */
  vbr?: number;

  /** Audio bitrate in kbps */
  abr?: number;

  /** Total bitrate in kbps */
  tbr?: number | null;

  /** Resolution string (e.g., "1920x1080") */
  resolution?: string;

  /** Aspect ratio (width/height) */
  aspect_ratio?: number | null;

  /** Approximate file size in bytes */
  filesize_approx?: number | null;

  /** HTTP headers required for download */
  http_headers?: {
    'User-Agent'?: string;
    'Accept'?: string;
    'Accept-Language'?: string;
    'Sec-Fetch-Mode'?: string;
    [key: string]: string | undefined;
  };

  /** Full format description string */
  format: string;

  /** Audio sample rate in Hz */
  asr?: number | null;

  /** Exact file size in bytes */
  filesize?: number | null;

  /** Source preference (-1 = lower priority) */
  source_preference?: number;

  /** Number of audio channels */
  audio_channels?: number | null;

  /** Quality score */
  quality?: number;

  /** Whether format has DRM protection */
  has_drm?: boolean;

  /** Audio language code */
  language?: string | null;

  /** Language preference score */
  language_preference?: number;

  /** General preference score */
  preference?: number | null;

  /** Dynamic range (SDR, HDR, etc.) */
  dynamic_range?: string | null;

  /** Container format */
  container?: string;

  /** Unix timestamp when format became available */
  available_at?: number;

  /** Downloader-specific options */
  downloader_options?: {
    /** HTTP chunk size for download */
    http_chunk_size?: number;
    [key: string]: any;
  };
}

export interface YtVideo_Thumbnail {
  /** Thumbnail URL */
  url: string;

  /** Preference score */
  preference?: number;

  /** Thumbnail ID */
  id: string;

  /** Thumbnail height */
  height?: number;

  /** Thumbnail width */
  width?: number;

  /** Resolution string */
  resolution?: string;
}

export interface YtVideo_AutomaticCaption {
  /** Caption file extension */
  ext: string;

  /** Caption file URL */
  url: string;

  /** Language name */
  name: string;

  /** Whether impersonation is used */
  impersonate?: boolean;

  /** yt-dlp client used */
  __yt_dlp_client?: string;
}

export interface YtVideo_Subtitle {
  /** Subtitle file extension */
  ext: string;

  /** Subtitle file URL */
  url: string;

  /** Language name */
  name: string;

  /** Whether impersonation is used */
  impersonate?: boolean;

  /** yt-dlp client used */
  __yt_dlp_client?: string;
}

export interface YtVideo_Chapter {
  start_time: number;
  title: string;
  end_time: number;
}

export interface YtVideo {
  /** Video ID */
  id: string;

  /** Video title */
  title: string;

  /** Available formats (video/audio streams) */
  formats: YtVideo_Format[];

  /** Available thumbnails */
  thumbnails?: YtVideo_Thumbnail[];

  /** Default thumbnail URL */
  thumbnail?: string;

  /** Video description */
  description?: string;

  /** Channel ID */
  channel_id?: string;

  /** Channel URL */
  channel_url?: string;

  /** Video duration in seconds */
  duration?: number;

  /** Number of views */
  view_count?: number;

  /** Average rating (deprecated on YouTube) */
  average_rating?: number | null;

  /** Age restriction (0, 18, etc.) */
  age_limit?: number;

  /** Original webpage URL */
  webpage_url?: string;

  /** Video categories */
  categories?: string[];

  /** Video tags */
  tags?: string[];

  /** Whether video can be embedded */
  playable_in_embed?: boolean;

  /** Live status (is_live, was_live, not_live, etc.) */
  live_status?: string;

  /** Release timestamp (Unix time) */
  release_timestamp?: number | null;

  /** Format sort fields (internal) */
  _format_sort_fields?: string[];

  /** Auto-generated captions by language */
  automatic_captions?: {
    [language: string]: YtVideo_AutomaticCaption[];
  };

  /** Manual subtitles by language */
  subtitles?: {
    [language: string]: YtVideo_Subtitle[];
  };

  /** Number of comments */
  comment_count?: number;

  /** Video chapters/sections */
  chapters?: YtVideo_Chapter[] | null;

  /** Engagement heatmap data */
  heatmap?: any | null;

  /** Number of likes */
  like_count?: number;

  /** Channel name */
  channel?: string;

  /** Channel subscriber count */
  channel_follower_count?: number;

  /** Whether channel is verified */
  channel_is_verified?: boolean;

  /** Uploader name */
  uploader?: string;

  /** Uploader ID/handle */
  uploader_id?: string;

  /** Uploader profile URL */
  uploader_url?: string;

  /** Upload date (YYYYMMDD format) */
  upload_date?: string;

  /** Upload timestamp (Unix time) */
  timestamp?: number;

  /** Availability status (public, private, unlisted, etc.) */
  availability?: string;

  /** Original input URL */
  original_url?: string;

  /** Webpage URL basename */
  webpage_url_basename?: string;

  /** Webpage domain */
  webpage_url_domain?: string;

  /** Extractor name */
  extractor?: string;

  /** Extractor key */
  extractor_key?: string;

  /** Playlist info (if video is part of playlist) */
  playlist?: any | null;

  /** Position in playlist */
  playlist_index?: number | null;

  /** Display ID (usually same as id) */
  display_id?: string;

  /** Full title */
  fulltitle?: string;

  /** Duration as formatted string (MM:SS) */
  duration_string?: string;

  /** Release year */
  release_year?: number | null;

  /** Whether video is currently live */
  is_live?: boolean;

  /** Whether video was a live stream */
  was_live?: boolean;

  /** Requested subtitle languages */
  requested_subtitles?: any | null;

  /** Whether video has DRM */
  _has_drm?: any | null;

  /** Extraction timestamp (Unix time) */
  epoch?: number;

  /** Selected formats for download (video + audio) */
  requested_formats?: YtVideo_Format[];

  /** Selected format string */
  format?: string;

  /** Selected format ID */
  format_id?: string;

  /** Output file extension */
  ext?: string;

  /** Download protocol */
  protocol?: string;

  /** Selected language */
  language?: string | null;

  /** Selected format note */
  format_note?: string;

  /** Approximate total file size */
  filesize_approx?: number;

  /** Total bitrate */
  tbr?: number;

  /** Output video width */
  width?: number;

  /** Output video height */
  height?: number;

  /** Output resolution */
  resolution?: string;

  /** Output FPS */
  fps?: number;

  /** Output dynamic range */
  dynamic_range?: string;

  /** Output video codec */
  vcodec?: string;

  /** Output video bitrate */
  vbr?: number;

  /** Stretched ratio (if applicable) */
  stretched_ratio?: any | null;

  /** Output aspect ratio */
  aspect_ratio?: number;

  /** Output audio codec */
  acodec?: string;

  /** Output audio bitrate */
  abr?: number;

  /** Output audio sample rate */
  asr?: number;

  /** Output audio channels */
  audio_channels?: number;

  /** Internal filename (before post-processing) */
  _filename?: string;

  /** Final output filename */
  filename?: string;

  /** Type identifier */
  _type?: string;

  /** yt-dlp version info */
  _version?: {
    /** yt-dlp version string */
    version: string;

    /** Current git commit (if dev build) */
    current_git_head: string | null;

    /** Release git commit */
    release_git_head: string;

    /** Repository name */
    repository: string;
  };
}

export interface YtVideoListItem {
  yt_id: string;
  title: string;
  thumbnail: string; // can be proxied
  thumbnail_src: string; // original
  duration: number;
  view_count: string; // A value with unknown units (K, M, B, ...), we add 'X' as units
  channel_name: string;
  channel_id: string;
  upload_date: string; // N/A

  is_watch_later?: boolean;
  is_starred?: boolean;
}

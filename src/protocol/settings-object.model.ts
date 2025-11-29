export interface SettingsObject {
  LANG: string; // 'xx'
  DEFAULT_QUALITY: string; // '<nn>p'
  /** @deprecated Replaced by a global constant */
  PAGE_SIZE: string; // '10', '500'
  RELAY_PROXY_THUMBNAILS: string; // '0' | '1'
}

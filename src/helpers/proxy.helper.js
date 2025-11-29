var ProxyHelper = {
  PROXY_ROUTE: '/relay',

  ENDPOINT_HLS_MANIFEST: '/hls/manifest',
  ENDPOINT_HLS_SEG: '/hls/seg',
  ENDPOINT_IMG: '/img',

  _proxyBaseUrlCached: null,

  wrapUrl: function (proxyEndpoint, referenceReq, url, token) {
    return (
      ProxyHelper._getBaseUrl(referenceReq) + ProxyHelper.PROXY_ROUTE + proxyEndpoint +
      '?url=' + encodeURIComponent(url) +
      '&token=' + encodeURIComponent(token)
    );
  },

  wrapObjectThumbnail: function (referenceReq, objRef, token, thumbnailKey = 'thumbnail') {
    if (objRef && objRef[thumbnailKey]) {
      var thumbnailSrc = objRef[thumbnailKey],
          srcKey = thumbnailKey + '_src';
      Object.assign(objRef, {
        [srcKey]: objRef[srcKey] || thumbnailSrc,
        [thumbnailKey]: ProxyHelper.wrapUrl(ProxyHelper.ENDPOINT_IMG,referenceReq, thumbnailSrc, token),
      });
    }
    return objRef;
  },

  /**
   * @param { Request } referenceReq
   * @param { YtVideo } videoRef
   * @param { string } token
   * @returns { YtVideo }
   */
  wrapVideoFormats: function (referenceReq, videoRef, token) {
    if (videoRef) {
      var hlsUrlKeys = ['url', 'manifest_url'];
      ['formats', 'requested_formats'].forEach((arrKey) => {
        if (Array.isArray(videoRef[arrKey])) {
          videoRef[arrKey].forEach(/** @param { YtVideo_Format } formatRef */ (formatRef) => {
            if (formatRef.url) {
              // HLS manifest
              if (formatRef.protocol && (formatRef.protocol + '').includes('m3u8')) {
                hlsUrlKeys.forEach((k) => {
                  if (formatRef[k]) {
                    formatRef[k] = ProxyHelper.wrapUrl(ProxyHelper.ENDPOINT_HLS_MANIFEST, referenceReq, formatRef[k], token);
                  }
                });
              }
              // ... other formats wrapping, currently not needed
            }
          });
        }
      });
    }
    return videoRef;
  },

  _getBaseUrl: function (req) {
    if (!ProxyHelper._proxyBaseUrlCached) {
      ProxyHelper._createBaseUrlAndCache(req);
    }
    return ProxyHelper._proxyBaseUrlCached;
  },

  _createBaseUrlAndCache: function (req) {
    ProxyHelper._proxyBaseUrlCached = (
      (req.get('x-forwarded-proto') || req.protocol) +
      '://' +
      (req.get('x-forwarded-host') || req.get('host'))
    );
  },
};

module.exports = ProxyHelper;

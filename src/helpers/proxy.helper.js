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
      var thumbnailSrc = objRef[thumbnailKey];
      Object.assign(objRef, {
        [thumbnailKey + '_src']: thumbnailSrc,
        [thumbnailKey]: ProxyHelper.wrapUrl(ProxyHelper.ENDPOINT_IMG,referenceReq, thumbnailSrc, token),
      });
    }
    return objRef;
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

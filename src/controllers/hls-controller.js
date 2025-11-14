var axios = require('axios');
var _ = require('lodash');
var m3u8 = require('@eyevinn/m3u8');
var { Readable } = require('stream');

var HlsController = {
  _proxyBaseUrlCached: null,

  m3u8: async function (req, res) {
    try {
      var url = req.query.url,
          token = req.query.token;

      if (!url) {
        res.status(400).json({ error: 'URL parameter required' });
      } else if (!/\.m3u8/.test(url)) {
        res.status(400).json({ error: 'Invalid m3u8 URL' });
      } else {
        var method = req.method.toUpperCase();

        var { m3u, headers } = await HlsController._fetchAndParseManifest(url);

        var allowedHeaders = [
          'content-type',
          'date',
          'pragma',
          'content-range',
          'accept-ranges',
          'cache-control',
          'etag',
          'last-modified',
          'x-xss-protection',
          'alt-svc',
          'transfer-encoding'
        ];

        if (headers) {
          Object.keys(headers).forEach(key => {
            if (allowedHeaders.includes(key.toLowerCase())) {
              res.setHeader(key, headers[key]);
            }
          });
        }

        res.header('content-type', 'application/vnd.apple.mpegurl');

        if (method === 'HEAD') {
          res.end();
        } else {
          [
            'PlaylistItem',
            'StreamItem',
            'IframeStreamItem',
            'MediaItem',
          ].forEach((itemType) => {
            if (m3u.items && Array.isArray(m3u.items[itemType])) {
              m3u.items[itemType].forEach((item) => {
                item.set('uri', HlsController._wrapUrl(req, item.get('uri'), token));
              });
            }
          });
          res.send(m3u.toString());
        }
      }
    } catch (e) {
      res.status(500).json({ error: e + '' });
    }
  },

  seg: async function (req, res) {
    try {
      var url = req.query.url,
          method = req.method.toUpperCase();
      if (!url) {
        res.status(400).json({ error: 'URL parameter required' });
      } else {
        var response = await axios({
          method,
          url,
          responseType: method === 'HEAD' ? 'text' : 'stream',
          headers: _.omit(req.headers, [
            'host',
            'origin',
            'referer',
          ]),
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });

        res.status(response.status);
        response.data.pipe(res);

        response.data.on('error', function (err) {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });
      }
    } catch (e) {
      res.status(500).json({ error: e + '' });
    }
  },

  _getBaseUrl: function (req) {
    if (!HlsController._proxyBaseUrlCached) {
      HlsController._createBaseUrlAndCache(req);
    }
    return HlsController._proxyBaseUrlCached;
  },

  _createBaseUrlAndCache: function (req) {
    HlsController._proxyBaseUrlCached = (
      (req.get('x-forwarded-proto') || req.protocol) +
      '://' +
      (req.get('x-forwarded-host') || req.get('host'))
    );
  },

  _wrapUrl: function (req, url, token) {
    return (
      HlsController._getBaseUrl(req) +
      '/hls/seg?url=' + encodeURIComponent(url) +
      '&token=' + encodeURIComponent(token)
    );
  },

  _fetchAndParseManifest: async function (url) {
    var headers;
    return new Promise((resolve, reject) => {
      var parser = m3u8.createStream();

      parser.on('m3u', (m3u) => {
        resolve({ m3u, headers });
      });

      parser.on('error', (err) => {
        reject(new Error('Failed to parse master manifest: ' + err));
      });

      fetch(new URL(url).href)
        .then((response) => {
          if (response.status === 200) {
            headers = response.headers;
            Readable.fromWeb(response.body).pipe(parser);
          } else {
            reject(new Error('Failed to fetch master manifest'));
          }
        });
    });
  },
};

module.exports = HlsController;

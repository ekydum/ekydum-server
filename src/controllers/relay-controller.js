var axios = require('axios');
var _ = require('lodash');
var m3u8 = require('@eyevinn/m3u8');
var { Readable } = require('stream');
var ProxyHelper = require('../helpers/proxy.helper');

var RelayController = {
  root: function () {
    return function (req, res) {
      res.json({ server: 'ekydum-relay' });
    };
  },

  hlsManifest: function () {
    var self = RelayController;
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
    var validateManifestUrl = function (url) {
      return /\.m3u8/.test(url);
    };
    var supportedManifestEntities = [
      'PlaylistItem',
      'StreamItem',
      'IframeStreamItem',
      'MediaItem',
    ];
    var wrapManifestUrls = function (m3u, req, token) {
      var proxySegEndpoint = ProxyHelper.ENDPOINT_HLS_SEG;
      supportedManifestEntities.forEach((itemType) => {
        if (m3u.items && Array.isArray(m3u.items[itemType])) {
          m3u.items[itemType].forEach((item) => {
            item.set('uri', ProxyHelper.wrapUrl(proxySegEndpoint, req, item.get('uri'), token));
          });
        }
      });
    };

    return self._createProxy(async function (req, res, method, url, token) {
      if (validateManifestUrl(url)) {
        var { m3u, headers } = await self._fetchAndParseManifest(url);
        self._copyHeaders(headers, allowedHeaders, res);
        res.header('content-type', 'application/vnd.apple.mpegurl');
        if (method === 'HEAD') {
          res.end();
        } else {
          wrapManifestUrls(m3u, req, token);
          res.send(m3u.toString());
        }
      } else {
        res.status(400).json({ error: 'Invalid m3u8 URL' });
      }
    });
  },

  hlsSeg: function () {
    var self = RelayController;

    return self._createProxy(async function(req, res, method, url) {
      var response = await axios({
        method,
        url,
        responseType: method === 'HEAD' ? 'text' : 'stream',
        headers: self._getSafeReqHeaders(req.headers),
        validateStatus: self._validateStatus,
      });
      res.status(response.status);
      response.data.pipe(res);
      response.data.on('error', function (err) {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream error' });
        }
      });
    });
  },

  img: function() {
    var self = RelayController;
    var allowedHeaders = [
      'content-type',
      'content-length',
      'cache-control',
      'expires',
      'etag',
      'last-modified',
      'age',
      'date',
    ];

    return self._createProxy(async function(req, res, method, url) {
      var response = await axios({
        method,
        url,
        responseType: method === 'HEAD' ? 'text' : 'stream',
        headers: self._getSafeReqHeaders(req.headers),
        validateStatus: self._validateStatus,
      });
      self._copyHeaders(response.headers, allowedHeaders, res)
      res.status(response.status);
      if (method === 'HEAD') {
        res.end();
      } else {
        response.data.pipe(res);
        response.data.on('error', function (err) {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });
      }
    });
  },

  _createProxy: function(handler) {
    return async function (req, res) {
      try {
        var url = req.query.url,
            token = req.query.token,
            method = req.method.toUpperCase();
        if (url) {
          await handler(req, res, method, url, token);
        } else {
          res.status(400).json({ error: 'URL parameter required' });
        }
      } catch (e) {
        res.status(500).json({ error: e + '' });
      }
    };
  },

  _getSafeReqHeaders: function (headers) {
    return _.omit(headers, [
      'host',
      'origin',
      'referer',
    ]);
  },

  _copyHeaders: function (srcHeaders, allowedHeaders, res) {
    if (srcHeaders) {
      Object.keys(srcHeaders).forEach(key => {
        if (allowedHeaders.includes(key.toLowerCase())) {
          res.setHeader(key, srcHeaders[key]);
        }
      });
    }
  },

  _validateStatus: function (status) {
    return status >= 200 && status < 400;
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
        })
        .catch((fe) => {
          reject(fe);
        });
    });
  },
};

module.exports = RelayController;

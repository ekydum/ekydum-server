var express = require('express');
var router = express.Router();
var RelayController = require('../controllers/relay-controller');
var { requireAccountToken } = require('../middleware/auth');
var ProxyHelper = require('../helpers/proxy.helper');

router.use(requireAccountToken);

router.get('/', RelayController.root());

router
  .head(ProxyHelper.ENDPOINT_HLS_MANIFEST, RelayController.hlsManifest())
  .get(ProxyHelper.ENDPOINT_HLS_MANIFEST, RelayController.hlsManifest());

router
  .get(ProxyHelper.ENDPOINT_HLS_SEG, RelayController.hlsSeg());

router
  .head(ProxyHelper.ENDPOINT_IMG, RelayController.img())
  .get(ProxyHelper.ENDPOINT_IMG, RelayController.img());

module.exports = router;

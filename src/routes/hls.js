var express = require('express');
var router = express.Router();
var ProxyController = require('../controllers/hls-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken);

router.get('/', function (req, res) {
  res.json({ server: 'ekydum/hls' });
});

router
  .head('/m3u8', ProxyController.m3u8)
  .get('/m3u8', ProxyController.m3u8);

router
  .get('/seg', ProxyController.seg);

module.exports = router;

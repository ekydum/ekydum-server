var express = require('express');
var router = express.Router();
var SettingsController = require('../controllers/settings-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken);

router.get('/', SettingsController.getSettings());
router.put('/:key', SettingsController.updateSetting());

module.exports = router;

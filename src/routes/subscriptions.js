var express = require('express');
var router = express.Router();
var SubscriptionsController = require('../controllers/subscriptions-controller');
var { requireAccountToken } = require('../middleware/auth');

router.use(requireAccountToken());

router.post('/', SubscriptionsController.subscribe());
router.get('/', SubscriptionsController.getSubscriptions());
router.get('/check/:yt_channel_id', SubscriptionsController.checkSubscription());
router.delete('/:id', SubscriptionsController.unsubscribe());

module.exports = router;

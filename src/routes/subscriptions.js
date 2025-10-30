var express = require('express');
var router = express.Router();
var SubscriptionsController = require('../controllers/subscriptions-controller');
var { requireAccountToken } = require('../middleware/auth');

// All subscription routes require account token
router.use(requireAccountToken);

router.post('/', SubscriptionsController.subscribe);
router.get('/', SubscriptionsController.getSubscriptions);
router.delete('/:id', SubscriptionsController.unsubscribe);

module.exports = router;

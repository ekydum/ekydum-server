var Redis = require('ioredis');

var redis = new Redis(process.env.REDIS_URL, {
  retryStrategy: function(times) {
    var delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', function() {
  console.log('Redis connected');
});

redis.on('error', function(err) {
  console.error('Redis error:', err);
});

module.exports = redis;

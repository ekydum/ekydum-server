#!/usr/bin/env node

var crypto = require('crypto');

// Generate 128 character hex token (64 bytes)
var token = crypto.randomBytes(64).toString('hex');

console.log('Generated ADMIN_TOKEN (128 characters):');
console.log(token);
console.log('\nAdd this to your .env file:');
console.log('ADMIN_TOKEN=' + token);

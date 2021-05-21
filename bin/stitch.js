#!/usr/bin/env node

require('v8-compile-cache');

const { run } = require('../lib/stitch');

if (require.main === module) {
  run();
}

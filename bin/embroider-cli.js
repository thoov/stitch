#!/usr/bin/env node

require('v8-compile-cache');

const { run } = require('../lib/embroider-cli');

if (require.main === module) {
  run();
}

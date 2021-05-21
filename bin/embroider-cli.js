#!/usr/bin/env node

require('v8-compile-cache');

const { run } = require('../lib/embroider-cli');

if (require.main === module) {
  run();
}

// const { CheckupTaskRunner, getFormatter } = require('@checkup/cli');

// const taskRunner = new CheckupTaskRunner({
//   cwd: process.cwd(),
//   tasks: [
//     'plugins/package-dependencies',
//   ],
// });

// // returns a json obj
// const result = await taskRunner.run();

// // creates a markdown report
// const formatter = getFormatter({
//   cwd: process.cwd(),
//   format: 'pretty',
// });

// formatter.format(result);

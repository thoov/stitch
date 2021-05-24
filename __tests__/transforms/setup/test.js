'use strict';

const { runTransformTest } = require('codemod-cli');

runTransformTest({ 
  name: 'setup',
  path: require.resolve('../../../src/codemods/transforms/setup/index.js'),
  fixtureDir: `${__dirname}/__fixtures__/`,
});

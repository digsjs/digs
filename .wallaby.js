'use strict';

module.exports = function wallabyConfig() {
  return {
    files: [
      'lib/**/*.js'
    ],
    tests: [
      'test/**/*.js'
    ],
    env: {
      type: 'node'
    },
    testFramework: 'mocha',
    bootstrap: function bootstrap(wallaby) {
      var path = require('path');
      require(path.join(wallaby.localProjectDir, 'test', 'fixture'));
    }
  };
};

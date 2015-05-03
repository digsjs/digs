'use strict';

module.exports = function (grunt) {
  var loadGruntConfig = require('load-grunt-config');
  var pkg = grunt.file.readJSON('package.json');

  if (grunt.option('time')) {
    require('time-grunt')(grunt);
  }

  loadGruntConfig(grunt, {
    jitGrunt: {
      staticMappings: {
        devUpdate: 'grunt-dev-update',
        'bump-only': 'grunt-bump',
        'bump-commit': 'grunt-bump',
        mochacov: 'grunt-mocha-cov'
      }
    },
    data: {
      pkg: pkg
    }
  });
};

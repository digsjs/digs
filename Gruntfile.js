'use strict';

module.exports = function (grunt) {
  const loadGruntConfig = require('load-grunt-config'),
    util = require('util');
  const pkg = grunt.file.readJSON('package.json');
  let cfg;

  if (grunt.option('time')) {
    require('time-grunt')(grunt);
  }

  cfg = loadGruntConfig(grunt, {
    init: false,
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

  grunt.verbose.ok('Grunt config:\n%s', util.inspect(cfg, {depth: null}));

  grunt.initConfig(cfg);
};

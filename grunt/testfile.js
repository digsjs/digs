'use strict';

module.exports = function (grunt) {

  var path = require('path');

  function assert(target) {
    if (!target) {
      grunt.fail.warn('Invalid target; must be path to .js file(s) or ' +
        'directory');
    }

    if (!grunt.file.exists(target)) {
      grunt.fail.warn(require('util').format('File "%s" does not exist',
        target));
    }
  }

  function getTestFilepath(target) {
    return grunt.file.isDir(target) ?
      path.join('test/unit/', target, '**/*.spec.js') :
      path.join('test/unit', path.dirname(target),
        path.basename(target, '.js') + '.spec.js');
  }

  grunt.registerTask('watchfile', 'Watch for changes, then lint & test',
    function () {

      var args = Array.prototype.slice.call(arguments);

      function configure(target) {
        var config = {
            watch: {}
          },
          isDir = grunt.file.isDir(target),
          testFilepath = getTestFilepath(target),
          files =
            isDir ?
              [path.join(target, '**/*.js'),
                testFilepath] :
              [target,
                testFilepath];

        config.watch[target] = {
          files: files,
          tasks: 'testfile:' + target
        };

        return config;
      }

      args.forEach(function (target) {
        var config;

        assert(target);

        config = configure(target);
        grunt.config.merge(config);

        grunt.onLog.ok('Watching: %s', config.watch[target].files.join(', '));
        grunt.task.run('watch:' + target);
      });
    });

  grunt.registerTask('testfile', 'Lint & Test', function () {

    var args = Array.prototype.slice.call(arguments);

    function configure(target) {
      var config = {
          eslint: {},
          mochacov: {}
        },
        testFilepath = getTestFilepath(target);

      config.eslint[target] = [target, testFilepath];
      config.mochacov[target] = testFilepath;

      return config;
    }

    args.forEach(function (target) {
      var config;
      assert(target);

      config = configure(target);
      grunt.config.merge(config);

      grunt.onLog.ok('Linting: %s', config.eslint[target].join(', '));
      grunt.task.run('eslint:' + target);
      grunt.onLog.ok('Testing: %s', config.mochacov[target]);
      grunt.task.run('mochacov:' + target);
    });

  });

};

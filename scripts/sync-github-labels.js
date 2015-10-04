#!/usr/bin/env node

'use strict';

var GitHubApi = require('github');
var Promise = require('digs-common').Promise;
var _ = require('digs-common').utils;
var childProcess = require('child-process-promise');
var binPath = Promise.promisify(require('bin-path')(require));
var format = require('util').format;
var path = require('path');

var github = new GitHubApi({
  version: "3.0.0",
  protocol: "https",
  host: "api.github.com",
  timeout: 5000,
  headers: {
    "user-agent": "digsjs-label-sync-script"
  }
});

var project = process.argv[2];
if (project) {
  console.log('Updating "digsjs/%s"', project);
} else {
  console.log('Querying GitHub for projects...');
}


binPath('github-labels')
  .get('labels')
  .then(function(executable) {
    function update(name) {
      return childProcess.spawn(executable,
        [
          '-c',
          require.resolve('./github-labels.json'),
          '-f',
          format('digsjs/%s', name)
        ])
        .then(function() {
          console.log('done.');
        });
    }

    console.log('Using github-labels executable "%s"',
      path.relative(process.cwd(), executable));

    if (project) {
      process.stdout.write(format('%s...', project));
      return update(project);
    }

    return Promise.promisify(github.repos.getFromOrg)({org: 'digsjs'})
      .then(function(data) {
        var names = _.pluck(data, 'name');
        console.log('Found %d repos to sync.', names.length);
        return Promise.each(names, function(name) {
          process.stdout.write(format('%s...', name));
          return update(name);
        });
      });
  })
  .catch(function(err) {
    console.log(err);
  });


#!/usr/bin/env node

'use strict';

const GitHubApi = require('github');
const Promise = require('digs-common').Promise;
const _ = require('digs-common').utils;
const childProcess = require('child-process-promise');
const binPath = Promise.promisify(require('bin-path')(require));
const path = require('path');

const github = new GitHubApi({
  version: '3.0.0',
  protocol: 'https',
  host: 'api.github.com',
  timeout: 5000,
  headers: {
    'user-agent': 'digsjs-label-sync-script'
  }
});

const project = process.argv[2];
if (project) {
  console.log(`Updating 'digsjs/${project}`, project);
} else {
  console.log('Querying GitHub for projects...');
}

binPath('github-labels')
  .get('labels')
  .then((executable) => {
    function update(name) {
      return childProcess.spawn(executable,
        [
          '-c',
          require.resolve('./github-labels.json'),
          '-f',
          `digsjs/${name}`
        ])
        .then(() => console.log('done.'));
    }

    console.log(`Using github-labels executable "%s"`,
      path.relative(process.cwd(), executable));

    if (project) {
      process.stdout.write(`${project}...`);
      return update(project);
    }

    return Promise.promisify(github.repos.getFromOrg)({org: 'digsjs'})
      .then((data) => {
        const names = _.pluck(data, 'name');
        console.log(`Found ${names.length} repos to sync.`);
        return Promise.each(names, (name) => {
          process.stdout.write(`${name}...`);
          return update(name);
        });
      });
  })
  .catch(err => console.log(err));


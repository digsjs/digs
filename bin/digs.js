#!/usr/bin/env node

/* eslint no-sync:0 */

'use strict';

let Digs = require('../lib');
let yaml = require('yaml-js');
let yargs = require('yargs');
let common = require('digs-common');
let fs = common.fs;
let Promise = common.Promise;

function parseConfig(filepath) {
  if (!filepath) {
    return Promise.resolve();
  }
  return fs.readFileAsync(filepath, 'utf8')
    .done(function success(file) {
      return /\.json$/.test(filepath) ? JSON.parse(file) : yaml.load(file);
    }, function fail() {
      throw new Error(`Cannot read or parse file at "${filepath}"`);
    });
}

const argv = yargs
  .option('config', {
    alias: 'c',
    describe: 'Config manifest file (JSON/YAML)',
    type: 'string'
  })
  .argv;

parseConfig(argv.config)
  .then(function createServer(config) {
    Digs.createServer(config);
  });


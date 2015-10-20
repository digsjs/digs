#!/usr/bin/env node

/* eslint no-sync:0 */

'use strict';

const digs = require('../lib');
const yaml = require('yaml-js');
const yargs = require('yargs');
const common = require('digs-common');
const fs = common.fs;
const Promise = common.Promise;
const debug = require('debug')('digs-cli');

function parseConfig(filepath) {
  if (!filepath) {
    return Promise.resolve();
  }
  debug('Attempting to read config file...');
  return fs.readFileAsync(filepath, 'utf8')
    .then((file) => {
      if (/\.json$/.test(filepath)) {
        debug('Attempting to parse config file as JSON...');
        return JSON.parse(file);
      }
      debug('Attempting to parse config file as YAML...');
      return yaml.load(file);
    })
    .tap(() => {
      debug('Succesfully parsed config file');
    })
    .catch((err) => {
      debug(err);
      throw new Error(`Cannot read or parse file at "${filepath}"`);
    });
}

const argv = yargs
  .option('config', {
    alias: 'c',
    describe: 'Config manifest file (JSON/YAML)',
    string: true
  })
  .option('debug', {
    boolean: true,
    describe: 'Enable debugging output (while starting server)'
  })
  .check((args) => {
    if (args.debug) {
      require('debug').enable('digs-*');
      debug('Debug mode enabled');
    }
    if (args.config) {
      debug(`Using config at path ${args.config}`);
    } else {
      debug('No config file specified');
    }
  })
  .argv;

parseConfig(argv.config)
  .then((config) => digs(config));


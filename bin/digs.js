#!/usr/bin/env node

/* eslint no-sync:0 */

'use strict';

const yaml = require('yaml-js');
const yargs = require('yargs');
const common = require('digs-common');
const fs = common.fs;
const Promise = common.Promise;
const _ = common.utils;

let debug;

function parseConfig(filepath) {
  if (!filepath) {
    return Promise.resolve({});
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
    'default': false,
    describe: 'Enable debugging output (until server instantiated)'
  })
  .check((args) => {
    if (args.debug) {
      common.debug.enable('digs*');
      debug = common.debug('digs:cli');
      debug('Debug mode enabled');
    }
    if (args.config) {
      debug(`Using config at path ${args.config}`);
    } else {
      debug('No config file specified');
    }
    return true;
  })
  .argv;

parseConfig(argv.config)
  .then((config) => {
    if (argv.debug) {
      _.set(config, 'server.app.debug', true);
    }
    return require('../lib')(config);
  });


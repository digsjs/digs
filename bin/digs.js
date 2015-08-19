#!/usr/bin/env node

/* eslint no-sync:0 */

'use strict';

let Digs = require('../lib');
let yaml = require('yaml-js');
let yargs = require('yargs');
let fs = require('graceful-fs');
let path = require('path');
let _ = require('lodash');

const SERVER_CONFIG = path.join(__dirname, '..', 'lib', 'server.yaml');

let argv = yargs
  .option('config', {
    alias: 'c',
    describe: 'Config manifest file (JSON/YAML)',
    type: 'string'
  })
  .argv;

let config;
try {
  config = yaml.load(fs.readFileSync(SERVER_CONFIG));
} catch (e) {
  throw new Error('Unable to parse digs.yaml');
}

let configPath = argv.config;
if (configPath) {
  try {
    if (/\.json$/.test(configPath)) {
      _.extend(config, JSON.parse(fs.readFileSync(configPath)));
    } else {
      _.extend(config, yaml.load(fs.readFileSync(configPath)));
    }
  } catch (e) {
    throw new Error(`Cannot read or parse file at "${configPath}"`);
  }
}

Digs.createServer(config);

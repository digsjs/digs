#!/usr/bin/env node

/* eslint no-sync:0 */

'use strict';

let Digs = require('../lib');
let yaml = require('yaml-js');
let yargs = require('yargs');
let fs = require('graceful-fs');

let argv = yargs
  .option('config', {
    alias: 'c',
    describe: 'Config manifest file (JSON/YAML)',
    type: 'string'
  })
  .argv;

let config;

let configPath = argv.config;
if (configPath) {
  try {
    if (/\.json$/.test(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      config = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    throw new Error(`Cannot read or parse file at "${configPath}"`);
  }
}

Digs.createServer(config);

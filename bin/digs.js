#!/usr/bin/env node

'use strict';

process.env.DEBUG = 'digs*';

let Digs = require('../lib');

let digs = new Digs();

digs.start();

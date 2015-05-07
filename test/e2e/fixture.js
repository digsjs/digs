'use strict';

var chai = require('chai'),
  Promise = require('bluebird');

global.expect = chai.expect;

Promise.longStackTraces();

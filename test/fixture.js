'use strict';

var chai = require('chai'),
  Promise = require('bluebird');

global.expect = chai.expect;

chai.use(require('sinon-chai'));

Promise.longStackTraces();

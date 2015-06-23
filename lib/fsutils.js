'use strict';

let Promise = require('bluebird');

let FSUtils = {
  findup: Promise.promisify(require('findup')),
  fs: Promise.promisifyAll(require('fs'))
};

module.exports = FSUtils;

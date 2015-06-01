'use strict';

/**
 * Expects a stream from package `split` and creates a JSON representation of
 * the USB ID database.  Its output is a key/value tuple to be consumed by
 * package `JSONStream`.
 *
 * We use this information to cross-reference the data provided by
 * `serialPort.list()`.
 * @module tools/usb-ids-transform-stream
 */

let through2 = require('through2');

let VENDOR_REGEX = /^([a-f0-9]{4})\s+(.+)$/,
  PRODUCT_REGEX = /^\t([a-f0-9]{4})\s+(.+)$/,

  opts = {
    objectMode: true
  };

module.exports = through2(opts, function (chunk, encoding, callback) {
  let groups;
  if ((groups = String(chunk).match(VENDOR_REGEX))) {
    if (this.lastId) {
      this.push([this.lastId, this.lastVendor]);
    }
    this.lastVendor = {
      name: groups[2],
      products: {}
    };
    this.lastId = '0x' + groups[1];
  }
  else if ((groups = String(chunk).match(PRODUCT_REGEX))) {
    this.lastVendor.products['0x' + groups[1]] = groups[2];
  }
  callback();
}, function (callback) {
  this.push([this.lastId, this.lastVendor]);
  callback();
});

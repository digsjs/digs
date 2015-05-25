'use strict';

let _ = require('lodash'),
  util = require('util');

//let debug = require('debug')('brickhouse:common:mixins');

let nonChainable = {

  format: function format() {
    return util.format.apply(null, arguments);
  }

};

_.mixin(nonChainable, {chain: false});

module.exports = _;

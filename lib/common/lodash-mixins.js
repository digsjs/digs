'use strict';

let _ = require('lodash'),
  slug = require('slug'),
  util = require('util');

let debug = require('debug')('digs:common:lodash-mixins'),
  slugs = new Set();

let nonChainable = {
  format: function format() {
    return util.format.apply(null, arguments);
  },
  slugify: function slugify(str) {
    if (!_.isString(str)) {
      return str;
    }
    let slugged = slug(str),
      slugified = slugged;
    while (slugs.has(slugified)) {
      slugified = _.uniqueId(slugged + '-');
    }
    slugified = slugified.toLowerCase();
    slugs.add(slugified);
    debug('Slugified "%s" to "%s"', str, slugified);
    return slugified;
  }
};

_.mixin(nonChainable, {
  chain: false
});

module.exports = _;

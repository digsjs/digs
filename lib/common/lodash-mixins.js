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
    if (str !== slugified) {
      debug('slugified: "%s" => "%s"', str, slugified);
    }
    return slugified;
  }
};

let chainable = {
  lock: function lock(obj, prop) {
    let props = _.toArray(arguments).slice(1);
    let definitions = _.object(props, _.map(props, function (prop) {
      return {
        value: obj[prop],
        enumerable: true
      };
    }));
    Object.defineProperties(obj, definitions);
    return obj;
  }
};

_.mixin(nonChainable, {
  chain: false
});
_.mixin(chainable);

module.exports = _;

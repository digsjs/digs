'use strict';

let slug = require('slug');

let slugs = new Set(),
  debug = require('debug')('brickhouse:common:slugify');

module.exports = function slugify(str) {
  let slugged = slug(str),
    slugified = slugged;
  while (slugs.has(slugified)) {
    slugified = _.uniqueId(slugged + '-');
  }
  slugified = slugified.toLowerCase();
  slugs.add(slugified);
  debug('Slugified "%s" to "%s"', str, slugified);
  return slugified;
};

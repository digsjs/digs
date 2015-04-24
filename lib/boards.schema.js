'use strict';

var Joi = require('joi');

var boards = Joi.array()
  .includes(require('./board'));

module.exports = boards;

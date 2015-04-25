'use strict';

var Joi = require('joi');

var boards = Joi.array()
  .includes(require('../board').schema);

module.exports = boards;

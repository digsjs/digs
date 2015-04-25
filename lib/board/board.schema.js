'use strict';

var Joi = require('joi');

var board = Joi.object({
  id: Joi.string()
    .required()
    .label('ID')
    .description('Unique identifier or name for this board'),
  port: Joi.string()
    .required()
    .description('port which this board is attached to'),
  connected: Joi.boolean()
    .default(false)
    .description('whether or not the board is ready for communication')
});

module.exports = board;

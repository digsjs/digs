'use strict';

var Joi = require('joi');

var board = Joi.object({
  id: Joi.string()
    .required()
    .label('ID'),
  name: Joi.string()
    .description('human readable name for this board'),
  port: Joi.string()
    .required()
    .description('port which this board is attached to'),
  ready: Joi.any()
    .default(false)
    .description('whether or not the board is ready for communication')
});

var components = Joi.object({

})

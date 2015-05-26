'use strict';

var Joi = require('joi');

var board = Joi.object()
  .keys({
    id: Joi.string()
      .required()
      .description('Unique identifier or name for this board'),
    port: Joi.string()
      .description('Port to which this board is attached'),
    connected: Joi.boolean()
      .default(false)
      .description('Whether or not the board is connected'),
    ready: Joi.boolean()
      .default(false)
      .description('Whether or not the board is ready for communication')
  })
  .unknown()
  // broken?
  //.type(require('./board').Board)
  .description('Development Board');

// dunno how to do this
var boards = Joi.object()
  .keys()
  .description('List of Boards');

module.exports = {
  board: board,
  boards: boards
};

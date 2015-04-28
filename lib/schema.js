'use strict';

var Joi = require('joi');

var board = Joi.object()
  .keys({
    id: Joi.string()
      .required()
      .description('Unique identifier or name for this board'),
    port: Joi.string()
      .description('port which this board is attached to'),
    connected: Joi.boolean()
      .default(false)
      .description('whether or not the board is ready for communication')
  })
  .unknown()
  .type(require('./model'))
  .description('Development Board');

var boards = Joi.array()
  .items(board)
  .description('List of Boards');

module.exports = {
  board: board,
  boards: boards
};

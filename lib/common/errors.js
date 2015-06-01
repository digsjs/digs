'use strict';

let _ = require('./lodash-mixins');

class BoardError extends Error {
  constructor(message, board) {
    super(message);
    this.board = board;
  }
}

class InvalidParameterError extends Error {
  constructor(message) {
    super(message || 'Invalid parameters');
  }
}

class ForkError extends BoardError {
  constructor(message, board) {
    super(_.format('%s: failed to fork after %d attempts: %s', board,
      board.retryMaxTries, message), board);
  }
}

class NotReadyError extends BoardError {
  constructor(message, board) {
    super(_.format('%s: failed to become ready after max tries reached ' +
      '(%d): %s', board, board.retryMaxTries, message), board);
  }
}

module.exports = {
  ForkError: ForkError,
  NotReadyError: NotReadyError,
  BoardError: BoardError,
  InvalidParameterError: InvalidParameterError
};

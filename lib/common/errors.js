'use strict';

let _ = require('./lodash-mixins');

class ForkError extends Error {
  constructor(message, board) {
    super(_.format('Board "%s" failed to fork after %d attempts: %s', board.id,
      board.retryInterval, message));
  }
}

class NotReadyError extends Error {
  constructor(board) {
    super(_.format('Board "%s" failed to get ready after max tries reached ' +
      '(%d)', board.id, board.retryMaxTries));
  }
}

module.exports = {
  ForkError: ForkError,
  NotReadyError: NotReadyError
};

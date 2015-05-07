'use strict';

var util = require('util'),
  _ = require('lodash');

var format = util.format;

module.exports = {

  /**
   * Event handlers for Worker processes.
   * @namespace Board.eventHandlers.worker
   */
  worker: {
    /**
     * Create an event handler for the `online` event (sent from Worker)
     * @param {Board} board Board instance
     * @returns {onlineFactory~online} Actual handler
     */
    online: function onlineFactory(board) {
      /**
       * Attempts to retry if J5 board connection fails, and
       * the option is set.
       * @this Worker
       */
      return function online() {
        var retryTimeout = board._retryTimeout,
          connectionTimeout = board._connectionTimeout;
        board.log('debug',
          format('Worker connected with id "%d"', this.id));
        board._connection = setTimeout(function () {
          board.log('error',
            format('Connection timeout of %dms reached!', connectionTimeout));
          this.kill();
          // TODO max retries
          if (retryTimeout) {
            board.log('info',
              format('Retrying connection in %dms', retryTimeout));
            board._connection =
              setTimeout(board.start.bind(board), retryTimeout);
          } else {
            board.emit('timeout');
          }
        }.bind(this), connectionTimeout);
      };
    },
    disconnected: function disconnectedFactory(board) {
      /**
       * @this Worker
       */
      return function disconnected() {
        board.log('debug', format('Worker process "%s" disconnected', this.id));
      };
    },
    message: function messageFactory(board) {
      return function message(data) {
        if (data._messageId) {
          return;
        }
        switch (data.event) {
          case 'ready':
            if (board._connection) {
              clearTimeout(board._connection);
            }
            board.port = data.port;
            board.emit('ready', board);
            break;
          case 'log':
            board.log(data.tags, data.msg);
            break;
          case 'error':
            board.emit('error', data);
            delete board.port;
            this.kill();
            break;
          default:
            break;
        }
      };
    }
  }
};

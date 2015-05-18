'use strict';

(function patchJ5() {
  let _ = require('lodash'),
    stripAnsi = require('strip-ansi'),
    j5 = require('johnny-five');

  let boardProto = j5.Board.prototype;

  // redirect logs to server logs
  _.each(_.keys(boardProto.log.types), function (type) {
    boardProto[type] = function () {
      process.send({
        event: 'log',
        tags: [type, 'j5'],
        msg: _(arguments)
          .toArray()
          .map(stripAnsi)
          .compact()
          .join(': ')
      });
    };
  });

}());

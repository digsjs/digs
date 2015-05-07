'use strict';

(function patchJ5() {
  var _ = require('lodash'),
    j5 = require('johnny-five');

  var boardProto = j5.Board.prototype;

  // redirect logs to server logs
  _.each(_.keys(boardProto.log.types), function (type) {
    boardProto[type] = function () {
      process.send({
        event: 'log',
        tags: [type, 'j5'],
        msg: _(arguments)
          .toArray()
          .compact()
          .join(': ')
      });
    };
  });

}());

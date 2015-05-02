'use strict';


module.exports = function (server) {
  (function patchJ5() {
    var _ = require('lodash'),
      j5 = require('johnny-five');

    var boardProto = j5.Board.prototype;

    // redirect logs to server logs
    _.each(_.keys(boardProto.log.types), function (type) {
      boardProto[type] = (function (type) {
        return function () {
          var args = _(arguments)
            .compact()
            .toArray()
            .join(': ');

          server.log.apply(server, [[type, 'j5']].concat(args));
        };
      }(type));
    });

  }());
};

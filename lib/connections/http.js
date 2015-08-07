'use strict';

function connect(digs, opts) {
  return {
    port: opts.http.port,
    address: opts.http.address,
    labels: ['http']
  };
}

module.exports = connect;

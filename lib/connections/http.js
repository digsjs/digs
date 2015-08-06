'use strict';

function connect(opts) {
  return {
    port: opts.http.port,
    address: opts.http.address,
    labels: ['http']
  };
}

module.exports = connect;

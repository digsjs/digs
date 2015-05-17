'use strict';

var child_process = require('child_process'),
  path = require('path');

describe('worker', function () {

  describe('forking', function () {

    it('should throw if invalid environment', function (done) {
      child_process.fork(path.join(__dirname, '..', '..', 'lib', 'worker'), {
        silent: true
      })
        .on('message', function (msg) {
          expect(msg.event).to.equal('error');
          expect(msg.err).to.have.string('Invalid environment');
        })
        .on('exit', function (exitCode) {
          expect(exitCode).to.equal(1);
          done();
        });
    });

  });

});

'use strict';

var child_process = require('child_process'),
  logMessages = require('../../lib/worker/log-messages'),
  path = require('path');

const workerFile = path.join(__dirname, '..', '..', 'lib', 'worker');

describe('worker', function () {

  describe('forking', function () {

    it('should throw if invalid environment', function (done) {
      child_process.fork(workerFile, {
        silent: true
      })
        .on('message', function (msg) {
          expect(msg.event).to.equal('log');
          expect(msg.msg).to.equal(logMessages.missingEnv());
        })
        .on('exit', function (exitCode) {
          expect(exitCode).to.equal(1);
          done();
        });
    });

  });

});

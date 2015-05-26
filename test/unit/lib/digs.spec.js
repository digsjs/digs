'use strict';

let Digs = require('../../../lib/digs'),
  BHEmitter = require('../../../lib/common/digs-emitter'),
  Hapi = require('hapi'),
  _ = require('lodash'),
  sinon = require('sinon');

describe('Digs', function () {

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('Digs');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should be an DigsEmitter instance', function () {
      expect(new Digs(new Hapi.Server()) instanceof
        BHEmitter).to.be.true;
    });

    it('should call Digs#createBoard for each k/v pair in opts object',
      function () {
        let createBoard = sandbox.stub(Digs.prototype, 'createBoard');

        new Digs(new Hapi.Server());
        expect(createBoard).not.to.have.been.called;

        new Digs(new Hapi.Server(), {
          foo: {}
        });
        expect(createBoard).to.have.been.calledOnce;
      });

    it('should set Brickhouse#boards, indexed by id', function () {
      let opts = {
          foo: {}
        },
        boards;

      sandbox.stub(Digs.prototype, 'createBoard');
      boards = new Digs(new Hapi.Server(), opts).boards;

      expect(_.size(boards)).to.equal(1);
      expect(boards.foo).to.be._board;
    });
  });

});

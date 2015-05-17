'use strict';

let Brickhouse = require('../../../lib/models/brickhouse'),
  BHEmitter = require('../../../lib/models/bhemitter'),
  config = require('../../../lib/config'),
  Hapi = require('hapi'),
  _ = require('lodash'),
  sinon = require('sinon');

describe('Brickhouse', function () {

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('Brickhouse');
    sandbox.stub(config.configure).andReturn({});
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should be an BHEmitter instance', function () {
      expect(new Brickhouse(new Hapi.Server()) instanceof
        BHEmitter).to.be.true;
    });

    it('should call Brickhouse#createBoard for each k/v pair in opts object',
      function () {
        let createBoard = sandbox.stub(Brickhouse.prototype, 'createBoard');

        new Brickhouse(new Hapi.Server());
        expect(createBoard).not.to.have.been.called;

        new Brickhouse(new Hapi.Server(), {
          id: 'foo'
        });
        expect(createBoard).to.have.been.calledOnce;
      });

    it('should set Brickhouse#boards, indexed by id', function () {
      let board = {
          id: 'foo'
        },
        boards;

      sandbox.stub(Brickhouse.prototype, 'createBoard');
      boards = new Brickhouse(new Hapi.Server(), board).boards;

      expect(_.size(boards)).to.equal(1);
      expect(boards.foo).to.be.board;
    });
  });

  describe('log', function () {

    var bh, logStub, args;

    beforeEach(function () {
      var server = new Hapi.Server();
      logStub = sandbox.stub(server, 'log');
      bh = new Brickhouse(server);
      args = ['foo', 'bar', 'baz'];
    });

    it('should call Hapi.Server#log', function () {
      bh.log.apply(bh, args);
      expect(logStub).to.have.been.called;
    });

    it('should prepend Brickhouse.NAME to the tags', function () {
      bh.log.apply(bh, args);
      expect(logStub).to.have.been.calledWith([Brickhouse.NAME]
        .concat(args[0]));
    });
  });

});

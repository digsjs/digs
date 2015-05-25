'use strict';

let Brickhouse = require('../../../lib/brickhouse'),
  BHEmitter = require('../../../lib/common/bhemitter'),
  Hapi = require('hapi'),
  _ = require('lodash'),
  sinon = require('sinon');

describe('Brickhouse', function () {

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('Brickhouse');
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
          foo: {}
        });
        expect(createBoard).to.have.been.calledOnce;
      });

    it('should set Brickhouse#boards, indexed by id', function () {
      let opts = {
          foo: {}
        },
        boards;

      sandbox.stub(Brickhouse.prototype, 'createBoard');
      boards = new Brickhouse(new Hapi.Server(), opts).boards;

      expect(_.size(boards)).to.equal(1);
      expect(boards.foo).to.be._board;
    });
  });

});

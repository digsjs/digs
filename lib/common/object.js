'use strict';

let stampit = require('stampit');
let EventEmitter = require('events').EventEmitter;
let EventEmittable = stampit.convertConstructor(EventEmitter);
let Joi = require('joi');
let _ = require('digs-utils');
let define = require('digs-utils/define');

const DigsObject = define({
  init: function init(context) {
    const digs = _.first(context.args);
    Joi.assert(digs, Joi.object({
      settings: Joi.object({
        app: Joi.object({
          namespace: Joi.string()
            .required(),
          project: Joi.string()
            .required()
        })
          .required()
          .unknown()
      })
        .required()
        .unknown()
    })
      .required()
      .unknown());
    let appSettings = digs.settings.app;
    this.namespace = appSettings.namespace;
    this.project = appSettings.project;
    this.digs = digs;
  }
})
  .compose(EventEmittable);

module.exports = DigsObject;

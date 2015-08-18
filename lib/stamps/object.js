'use strict';

let stampit = require('stampit');
let EventEmitter = require('events').EventEmitter;
let EventEmittable = stampit.convertConstructor(EventEmitter);
let Joi = require('joi');

function createDigsObject(params) {
  const digs = params.instance.digs;
  Joi.assert(digs, Joi.object().keys({
    settings: Joi.object().keys({
      app: Joi.object().keys({
        namespace: Joi.string().required(),
        project: Joi.string().required()
      }).unknown()
    }).unknown()
  }).unknown());
  let appSettings = digs.settings.app;
  this.namespace = appSettings.namespace;
  this.project = appSettings.project;
}

const DigsObject = stampit.init(createDigsObject).compose(EventEmittable);

module.exports = DigsObject;

'use strict';

module.exports = function (grunt) {

  grunt.registerTask('usbIds',
    'Download, parse and reformat the USB vendor/product ID database',
    function () {

      let http = require('http'),
        JSONStream = require('JSONStream'),
        split = require('split'),
        usbIdsTransformStream = require('./lib/usb-ids-transform-stream'),
        ProgressBar = require('progress'),
        fs = require('fs'),
        path = require('path'),
        zlib = require('zlib');

      const URL = 'http://www.linux-usb.org/usb.ids.gz',
        FILENAME = 'usb-ids.json',
        DIR = path.join(__dirname, '..', 'data');

      let done = this.async();

      grunt.log.ok('Fetching USB ID database...');

      http.get(URL, function (res) {
        if (res.statusCode !== '200') {
          let len = parseInt(res.headers['content-length'], 10),
            bar = new ProgressBar('  downloading [:bar] :percent :etas', {
              complete: '=',
              incomplete: ' ',
              width: 20,
              total: len
            });

          res.on('data', function (chunk) {
            bar.tick(chunk.length);
          })
            .on('error', function (err) {
              grunt.log.error('WARNING: ' + err.message);
            })
            .pipe(zlib.createGunzip())
            .pipe(split(/\n/))
            .pipe(usbIdsTransformStream)
            .pipe(JSONStream.stringifyObject('{\n', ',\n', '\n}\n', 2))
            .pipe(fs.createWriteStream(path.join(DIR, FILENAME)), {
              encoding: 'utf-8'
            })
            .on('end', function () {
              grunt.log.ok('Done');
              done();
            });
        }
        else {
          grunt.log.error('WARNING: Could not download USB ID database; received ' +
            'code %d', res.statusCode);
          if (res.statusMessage) {
            grunt.log.error('Status message: %s', res.statusMessage);
          }
        }
      });

    });

};

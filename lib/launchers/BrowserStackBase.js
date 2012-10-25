var browserstack = require('browserstack');
var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var path = require('path');
var rimraf = require('rimraf');

var log = require('../logger').create('launcher');

var env = process.env;

var BEING_CAPTURED = 1;
var CAPTURED = 2;
var BEING_KILLED = 3;
var FINISHED = 4;
var BEING_TIMEOUTED = 5;


var BrowserStackBase = function(id, emitter, captureTimeout, retryLimit) {

  var self = this;
  var capturingUrl;
  var exitCallback = function() {};

  this.id = id;
  this.state = null;
  this.browser = {};


  var tmpDir = (env.TMPDIR || env.TMP || env.TEMP || '/tmp') ;
  this._tempDir = path.normalize(tmpDir + '/testacular-' + id.toString());


  this.start = function(url) {
    capturingUrl = url;

    // tmp directory for testacular
    try {
      log.debug('Creating temp dir at ' + self._tempDir);
      fs.mkdirSync(self._tempDir);
    } catch (e) {}

    // get a browser object for use with browserstack
    self._getBrowser(self.client, self.name, function(error, browser){
      if (error) {
        log.error(error.message);
      }
      self.browser = browser;
      log.debug(browser);
      self._start(capturingUrl + '?id=' + self.id);
      self.state = BEING_CAPTURED;
    });

    if (captureTimeout) {
      setTimeout(self._onTimeout, captureTimeout);
    }
  };


  this._start = function(url) {
    log.debug('Starting with url:%', url);

  };


  this.markCaptured = function() {
    self.state = CAPTURED;
  };


  this.isCaptured = function() {
    return self.state === CAPTURED;
  };


  this.kill = function(callback) {
    exitCallback = callback || function() {};

    log.debug('Killing %s', self.name);

    if (self.state !== FINISHED) {
      self.state = BEING_KILLED;
      self._process.kill();
    } else {
      process.nextTick(exitCallback);
    }
  };


  this._onTimeout = function() {
    if (self.state !== BEING_CAPTURED) {
      return;
    }

    log.warn('%s have not captured in %d ms, killing.', self.name, captureTimeout);

    self.state = BEING_TIMEOUTED;
    self._process.kill();
  };


  this.toString = function() {
    return self.name;
  };


  this._getCommand = function() {
    var cmd = path.normalize(env[self.ENV_CMD] || self.DEFAULT_CMD[process.platform]);

    if (!cmd) {
      log.error('No binary for %s browser on your platform.\n\t' +
          'Please, set "%s" env variable.', self.name, self.ENV_CMD);
    }

    return cmd;
  };


  this._execCommand = function(cmd, args) {
    log.debug(cmd + ' ' + args.join(' '));
    self._process = spawn(cmd, args);

    var errorOutput = '';
    self._process.stderr.on('data', function(data) {
      errorOutput += data.toString();
    });

    self._process.on('close', function(code) {
      self._onProcessExit(code, errorOutput);
    });
  };


  this._onProcessExit = function(code, errorOutput) {
    log.debug('Process %s exitted with code %d', self.name, code);

    if (code) {
      log.error('Cannot start %s\n\t%s', self.name, errorOutput);
    }

    retryLimit--;

    if (self.state === BEING_CAPTURED || self.state === BEING_TIMEOUTED) {
      if (retryLimit > 0) {
        return self._cleanUpTmp(function() {
          log.info('Trying to start %s again.', self.name);
          self.start(capturingUrl);
        });
      } else {
        emitter.emit('browser_process_failure', self);
      }
    }

    self.state = FINISHED;
    self._cleanUpTmp(exitCallback);
  };


  this._cleanUpTmp = function(done) {
    log.debug('Cleaning temp dir %s', self._tempDir);
    rimraf(self._tempDir, done);
  };


  this._getOptions = function(url) {
    return [url];
  };

  this._getBrowser = function(client, name, callback){
  /*
   * name can be
   *  - BS::mac::Firefox::15.0
   *  - BS::win::Firefox --> defaults to version latest
   *  - BS::ios::iPhone4::4.3
   *  - BS::ios::iPhone4
   */
  var parts = name.split('::');
  var options = {
    version: parts.length === 4 ? parts.pop() : 'latest',
    browser: parts.pop(),
    os:      parts.pop()
  };

  client.getBrowsers(function(error, browsers){
    if (error) {
      log.error(error);
    }
    var filteredBrowsers = _.filter(browsers, function(b){
      var isBrowser;
      if (_.has(b, 'browser')) {
        isBrowser = b.browser === options.browser;
      }
      if (_.has(b, 'device')) {
        isBrowser = b.device.replace(' ', '') === options.device;
      }
      var isOS = b.os === options.os;
      var isVersion = true;
      if (options.version !== 'latest'){
        isVersion = b.version === options.version;
      }
      return isOS && isBrowser && isVersion;
    });
    // if we have more than one result and we want latest
    if (filteredBrowsers.length > 1 && options.version === 'latest') {
      // get the latest version from the api
      return client.getLatest(filteredBrowsers[0], function(error, version){
        if (error) {
          return callback(error);
        }
        // find the browser with this version in out list
        var browser = _.find(filteredBrowsers, function(b) {
          return b.version === version;
        });
        return callback(null, browser);
      });
    } else if (filteredBrowsers.length === 1) {
      // if there is only one result use this
      return callback(null, filteredBrowsers[0]);
    }
    return callback(new Error('No browser found: ' +  name));

  });
};


// Publish
module.exports = BrowserStackBase;
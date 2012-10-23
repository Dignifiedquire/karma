var browserstack = require('browserstack');
var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var path = require('path');
var env = process.env;
var _ = require('../util')._;

var log = require('../logger').create('launcher');
var BrowserStackBase = require('./BrowserStackBase');




var BrowserStackWrapper = function(id, emitter, name, config) {
  var browser = BrowserStackBase;

  var client = login(config.username, config.password);

  browser.prototype = {
    name: getBrowser(client, name)
  };

  console.log(config);
  var captureTimeout = 0;
  var retryLimit = 1;

  // return the newly constructed browser instance
  return new browser(id, emitter, captureTimeout, retryLimit);
};


var login = function(user, password){
  var client = browserstack.createClient({
    username: username,
    password: password
  });
};

var getBrowser = function(client, name){
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
    var browser = _.filter(browsers, function(b){
      var isBrowser = b.browser === options.browser;
      var isDevice = b.device.replace(' ', '') === options.browser;
      var isOS = b.os === options.os;
      var isVersion = true;
      if (version !== 'latest'){
        isVersion = b.version === options.version;
      }
      return isOS && (isBrowser || isDevice) && isVersion;
    });

  });
};




// PUBLISH
module.exports = BrowserStackWrapper;

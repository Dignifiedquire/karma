var browserstack = require('browserstack');
var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var path = require('path');
var env = process.env;
var tunnelClient = require('localtunnel');

var _ = require('../util')._;
var log = require('../logger').create('launcher');
var BrowserStackBase = require('./BrowserStackBase');

/*
 * TODO
 *  - create a list of refrences to all running browserstack browsers
 *  - listen to the 'exit' event on all browsers
 *  - if all browsers in the list were exited kill the tunnel process
 */

var createTunnel = function(port, callback){
  var host = 'http://localtunnel.me';
  var subdomain = '';
  tunnelClient.start(port, host, subdomain, function(error, url){
    if (error) {
      return log.error(error);
    }
    return callback(url);
  });

};



var BrowserStackWrapper = function(id, emitter, name, config, port) {
  var BrowserBase = BrowserStackBase;

  var client = login(config.username, config.password);

  getBrowser(client, name, function(error, browser){
    if (error) {
      log.error(error);
    }
    log.debug("Browser is ", browser);
  });

  createTunnel(port, function(url){
    log.debug('URL is %s', url);
  });
  BrowserBase.prototype = {
    name: name
  };

  var captureTimeout = 0;
  var retryLimit = 1;

  // return the newly constructed browser instance
  return new BrowserBase(id, emitter, captureTimeout, retryLimit);

};


var login = function(username, password){
  return browserstack.createClient({
    username: username,
    password: password
  });

};

var getBrowser = function(client, name, callback){
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




// PUBLISH
module.exports = BrowserStackWrapper;

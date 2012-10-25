var browserstack = require('browserstack');
var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var path = require('path');
var env = process.env;
var tunnelClient = require('localtunnel');
var Q = require('q');

var _ = require('../util')._;
var log = require('../logger').create('launcher');
var BrowserStackBase = require('./BrowserStackBase');

/*
 * TODO
 *  - create a list of refrences to all running browserstack browsers
 *  - listen to the 'exit' event on all browsers
 *  - if all browsers in the list were exited kill the tunnel process
 */

// this holds references to all browserstack browsers that have been created
var browsers = [];

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

  // setup login client for browserstack
  var client = browserstack.createClient({
    username: username,
    password: password
  });

  // setup tunnel with localtunnel
  createTunnel(port, function(tunnelURL){
    log.debug('URL is %s', tunnelURL);

    // set the needed properties on the prototype
    BrowserBase.prototype = {
      name: name,
      client: client,
      tunnel: tunnelURL
    };

  });


  var captureTimeout = 0;
  var retryLimit = 1;

  // create new browser instance
  var instance = new BrowserBase(id, emitter, captureTimeout, retryLimit);

  // save reference
  browser.push(instance);

  // return the newly constructed browser instance
  return instance;

};


var login = function(username, password){
  return

};


};




// PUBLISH
module.exports = BrowserStackWrapper;

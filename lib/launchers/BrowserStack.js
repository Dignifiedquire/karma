var browserstack = require('browserstack');
var fs = require('fs');
var events = require('events');

var BaseBrowser = require('./Base');


var BrowserStackBrowser = function(id, emitter, name, config) {
  
  var browser = function(){
    BaseBrowser.apply(this, arguments);
    var self = this;

    this._start = function(url) {
      // create the js file, that will open testacular
      var captureFile = this._tempDir + '/capture.js';
      var captureCode = '(new WebPage()).open("' + url + '");';
      fs.createWriteStream(captureFile).end(captureCode);
      this._execCommand('', [captureFile]);
    };

    this._execCommand = function(cmd, args) {

      self._process = new events.EventEmitter();
      self._process.kill = function(signal){
        console.log('Killing: ' + self.name);
        this.emit('close');
        this.emit('exit', 0, signal);
      };


      self._process.on('close', function(code) {
        self._onProcessExit(code);
      });
    };
  };

  browser.prototype = {
    name: name
  };

  console.log(config);
  var captureTimeout = 0;
  var retryLimit = 1;
  
  // return the newly constructed browser instance
  return new browser(id, emitter, captureTimeout, retryLimit);
};



// PUBLISH
module.exports = BrowserStackBrowser;

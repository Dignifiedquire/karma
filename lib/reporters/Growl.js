var util = require('util');
var path = require('path');
var growl = require('growl');

var u = require('../util');
var BaseReporter = require('./Base');


var GrowlReporter = function(formatError, reportSlow) {
  BaseReporter.call(this, formatError, reportSlow, function(){});

  this.renderBrowser = function(browser) {
    var results = browser.lastResult;
    var totalExecuted = results.success + results.failed;
    var msg = [util.format(
      "Executed %d of %d \
       Test", totalExecuted, results.total)];
    if (results.failed) {
      msg.push(util.format(this.X_FAILED, results.failed));
    }

    if (results.skipped) {
      msg.push(util.format('Skipped %d', results.skipped));
    }

    if (browser.isReady) {
      if (results.disconnected) {
        msg.push(this.FINISHED_DISCONNECTED);
      } else if (results.error) {
        msg.push(this.FINISHED_ERROR);
      } else if (!results.failed) {
        msg.push(this.FINISHED_SUCCESS);
      }

      msg.push(util.format(' (%s / %s)', u.formatTimeInterval(results.totalTime),
                                       u.formatTimeInterval(results.netTime)));
    }

    return msg;
  };

  this.renderBrowser = this.renderBrowser.bind(this);

  this.write = function() {
    var args = Array.prototype.slice.call(arguments);
    console.log(args);
    // the first argument is the title
    var title = args.shift();

    // the rest gets interpolated for the message text
    var message = util.format.apply(null, args);

    var options = {
      title: title,
      sticky: false,
      name: 'Testacular'
    };
    
    // send the actual message
    growl(message, options);
    
  };
  this.write = this.write.bind(this);

  this.writeCommonMsg = this.write;

  this.onRunStart = function(browsers) {
    this.browsers_ = browsers;
  };

  this.specSuccess = function(browser) {
    this.write(browser.shortName(), this.renderBrowser(browser));
  };
  
  this.specFailure = function(browser) {

  };

  this.specSkipped = function(browser) {

  };

  this.onSpecComplete = function(browser) {

  };

  this.onBrowserComplete = function(browser) {
    var messages = this.renderBrowser(browser);
    var that = this;

    messages.forEach(function(msg){
      that.write(browser.name, msg);
    });

    // if (result.skipped) {
    //   this.specSkipped(browser, result);
    // } else if (result.success) {
    //   this.specSuccess(browser, result);
    // } else {
    //   this.specFailure(browser, result);
    // }

    // if (reportSlow && result.time > reportSlow) {
    //   var specName = result.suite.join(' ') + ' ' + result.description;
    //   var time = u.formatTimeInterval(result.time);
    //   var message = util.format(this.SPEC_SLOW, browser, time, specName);

    //   this.writeCommonMsg(browser.shortName(), message);
    // }
  };

  this.onRunComplete = function(browsers, results) {
    if (browsers.length > 1 && !results.disconnected && !results.error) {
      if (!results.failed) {
        this.write('Success', this.TOTAL_SUCCESS, results.success);
      } else {
        this.write('Partly', this.TOTAL_FAILED, results.failed, results.success);
      }
    }

  };

  this.SPEC_FAILURE = '%s %s failed';
  this.SPEC_SLOW = '%s slow %s: %s';
  this.ERROR = '%s error';

  this.FINISHED_ERROR = ' Error';
  this.FINISHED_SUCCESS = ' Success';
  this.FINISHED_DISCONNECTED = ' Disconnected';

  this.X_FAILED = 'Failed %d';


};

// PUBLISH
module.exports = GrowlReporter;


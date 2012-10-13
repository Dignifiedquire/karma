var path = require('path');
var growl = require('growl');


var GrowlReporter = function(formatError, reportSlow) {
  
  
  this.write = function() {
    var message = Array.prototype.slice.call(arguments);
    
    var imageSrc = path.join(__dirname, '..', '..', 'static', 'img', 'icon_ok.png');
    var options = {
      title: 'Testacular',
      image: imageSrc,
      sticky: true,
      name: 'Testacular'
    };
    
    // send the actual message
    growl(message, options);
  };
};
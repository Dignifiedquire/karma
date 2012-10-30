var q = require('q');
var spawn = require('child_process').spawn;
var _ = require('../utils')._;



// Create a child process that handles the creation
// of the tunnel and return a q-promise that gets resolved
// when a tunnel url is found.
var create = function(cmd, port, timeout){
  var deferred = q.defer();

  var cmd = _.template(cmd, {port: port});
  var args = [];
  var regexp = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?/;
  var timeout = timeout || 5000;

  var process = spawn(cmd, args);

  // If the timeout passes reject the promise as this means
  // we haven't found a valid url in time.
  setTimout(deferred.reject("No valid url found."), timeout);

  // All data from the child process output is matched
  // in search for a valid url
  process.stdout.on('data', function(data){
    var url = data.match(regexp);
    if(url) {
      deferred.resolve(url[0]);
    }
  });

  process.stderr.on('data', function(data){
    deferred.reject(data);
  });

  return deferred.promise;
};





// Exports
exports.create = create;
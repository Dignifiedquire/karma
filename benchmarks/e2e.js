// Create a spawnable watch task. Doesnt actually spawn until called.
var testTask = require('grunt-benchmark').spawnTask('test', {
  // Text trigger to look for to know when to run the next step or exit
   trigger: 'Done, without errors.',

   // Base folder and Gruntfile
   // You'll want to setup a fixture base folder and Gruntfile.js
   // to ensure your Grunt'ing appropriately
   base: '../',
   gruntfile: '../grunt.js',

   // Additional Grunt options can be specified here
   e2e: 'test/e2e/*/testacular.conf.js'
});

// Our actual benchmark
module.exports = function(done) {

  // start the watch task
  testTask([function() {


  }, function() {

  }], function(result) {

    // All done, do something more with the output result or finish up the benchmark
    done();

  });

};
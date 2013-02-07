module.exports = (grunt) ->

  # Project configuration.
  grunt.initConfig
    mincss:
      docs:
        files:
          'css/app.css': 'css/app.css'
    uglify:
      docs:
        files:
          'javascript/app.js': [
            '_src/javascript/jquery.js'
            '_src/javascript/jquery.easing.js'
            '_src/javascript/ddsmoothmenu.js'
            '_src/javascript/jquery.flexslider.js'
            '_src/javascript/colortip.js'
            '_src/javascript/selectnav.js'
            '_src/javascript/custom.js'
          ]
    less:
      docs:
        files:
          'css/app.css': '_src/less/app.less'

    jade:
      options:
        pretty: true
      docs:
        files: 
          '_layouts/default.html': '_src/jade/default.jade'
          'index.html': '_src/jade/index.jade'
          
    
  grunt.loadNpmTasks 'grunt-contrib-mincss'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-less'
  grunt.loadNpmTasks 'grunt-contrib-jade'

  grunt.registerTask 'build', [
    'less:docs'
    'mincss:docs'
    'uglify:docs'
    'jade:docs'
  ]
  
  grunt.registerTask 'default', ['build']


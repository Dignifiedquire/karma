module.exports = (grunt) ->

  # Project configuration.
  grunt.initConfig
    connect:
      server:
        options:
          port: 9000
          base: '.'
          keepalive: true
    less:
      docs:
        files:
          'template/build/assets/css/app.css': 'template/src/less/app.less'

    uglify:
      docs:
        files:
          'template/build/assets/js/app.js': [
            'template/src/js/jquery.js'
            'template/src/js/jquery.easing.js'
            'template/src/js/ddsmoothmenu.js'
            'template/src/js/jquery.flexslider.js'
            'template/src/js/colortip.js'
            'template/src/js/selectnav.js'
            'template/src/js/custom.js'
          ]
    mincss:
      docs:
        files:
          'template/build/assets/css/app.css': 'template/build/assets/css/app.css'
    docs:
      options:
        title: 'Testacular'
        assets: './template/build/assets'
        output: './public'
        outputAssets: './public/assets'
        disableTests: true
        skin: './template/build'
      docs: ['src']
          
          
  
  grunt.loadTasks 'tasks'
  grunt.loadNpmTasks 'grunt-contrib-less'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-mincss'
  grunt.loadNpmTasks 'grunt-contrib-connect'
                
  grunt.registerTask 'build', ['less', 'mincss', 'uglify']
  grunt.registerTask 'server', ['connect']
  grunt.registerTask 'default', ['build', 'docs', 'server']

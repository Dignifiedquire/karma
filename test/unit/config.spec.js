var loadFile = require('mocks').loadFile
var path = require('path')
var helper = require('../../lib/helper')
var logger = require('../../lib/logger.js')

describe('config', () => {
  var m
  var e
  var mocks

  var resolveWinPath = p => helper.normalizeWinPath(path.resolve(p))

  var normalizeConfigWithDefaults = cfg => {
    if (!cfg.urlRoot) cfg.urlRoot = ''
    if (!cfg.files) cfg.files = []
    if (!cfg.exclude) cfg.exclude = []
    if (!cfg.junitReporter) cfg.junitReporter = {}
    if (!cfg.coverageReporter) cfg.coverageReporter = {}
    if (!cfg.plugins) cfg.plugins = []

    return m.normalizeConfig(cfg)
  }

  // extract only pattern properties from list of pattern objects
  var patternsFrom = function (list) {
    return list.map(pattern => pattern.pattern)
  }

  var wrapCfg = function (cfg) {
    return function (config) {
      return config.set(cfg)
    }
  }

  beforeEach(() => {
    mocks = {}
    mocks.process = {exit: sinon.spy()}
    var mockConfigs = {
      '/home/config1.js': wrapCfg({basePath: 'base', reporters: ['dots']}),
      '/home/config2.js': wrapCfg({basePath: '/abs/base'}),
      '/home/config3.js': wrapCfg({files: ['one.js', 'sub/two.js']}),
      '/home/config4.js': wrapCfg({port: 123, autoWatch: true, basePath: '/abs/base'}),
      '/home/config6.js': wrapCfg({reporters: 'junit'}),
      '/home/config7.js': wrapCfg({browsers: ['Chrome', 'Firefox']}),
      '/conf/invalid.js': () => {throw new SyntaxError('Unexpected token =')},
      '/conf/exclude.js': wrapCfg({exclude: ['one.js', 'sub/two.js']}),
      '/conf/absolute.js': wrapCfg({files: ['http://some.com', 'https://more.org/file.js']}),
      '/conf/both.js': wrapCfg({files: ['one.js', 'two.js'], exclude: ['third.js']}),
      '/conf/coffee.coffee': wrapCfg({files: [ 'one.js', 'two.js']})
    }

    // load file under test
    m = loadFile(__dirname + '/../../lib/config.js', mocks, {
      global: {},
      process: mocks.process,
      require: function (path) {
        if (mockConfigs[path]) {
          return mockConfigs[path]
        }
        if (path.indexOf('./') === 0) {
          return require('../../lib/' + path)
        } else {
          return require(path)
        }
      }
    })
    e = m.exports
  })

  describe('parseConfig', () => {
    var logSpy

    beforeEach(() => {
      logSpy = sinon.spy()
      logger.create('config').on('log', logSpy)
    })

    it('should resolve relative basePath to config directory', () => {
      var config = e.parseConfig('/home/config1.js', {})
      expect(config.basePath).to.equal(resolveWinPath('/home/base'))
    })

    it('should keep absolute basePath', () => {
      var config = e.parseConfig('/home/config2.js', {})
      expect(config.basePath).to.equal(resolveWinPath('/abs/base'))
    })

    it('should resolve all file patterns', () => {
      var config = e.parseConfig('/home/config3.js', {})
      var actual = [resolveWinPath('/home/one.js'), resolveWinPath('/home/sub/two.js')]
      expect(patternsFrom(config.files)).to.deep.equal(actual)
    })

    it('should keep absolute url file patterns', () => {
      var config = e.parseConfig('/conf/absolute.js', {})
      expect(patternsFrom(config.files)).to.deep.equal([
        'http://some.com',
        'https://more.org/file.js'
      ])
    })

    it('should resolve all exclude patterns', () => {
      var config = e.parseConfig('/conf/exclude.js', {})
      var actual = [
        resolveWinPath('/conf/one.js'),
        resolveWinPath('/conf/sub/two.js'),
        resolveWinPath('/conf/exclude.js')
      ]

      expect(config.exclude).to.deep.equal(actual)
    })

    it('should log error and exit if file does not exist', () => {
      e.parseConfig('/conf/not-exist.js', {})

      expect(logSpy).to.have.been.called
      var event = logSpy.lastCall.args[0]
      expect(event.level.toString()).to.be.equal('ERROR')
      expect(event.data).to.be.deep.equal(['File %s does not exist!', '/conf/not-exist.js'])
      expect(mocks.process.exit).to.have.been.calledWith(1)
    })

    it('should throw and log error if invalid file', () => {
      e.parseConfig('/conf/invalid.js', {})

      expect(logSpy).to.have.been.called
      var event = logSpy.lastCall.args[0]
      expect(event.level.toString()).to.be.equal('ERROR')
      expect(event.data).to.be.deep.equal([
        'Error in config file!\n',
        new SyntaxError('Unexpected token =')
      ])
      expect(mocks.process.exit).to.have.been.calledWith(1)
    })

    it('should override config with given cli options', () => {
      var config = e.parseConfig('/home/config4.js', {port: 456, autoWatch: false})

      expect(config.port).to.equal(456)
      expect(config.autoWatch).to.equal(false)
      expect(config.basePath).to.equal(resolveWinPath('/abs/base'))
    })

    it('should override config with cli options, but not deep merge', () => {
      // regression https://github.com/karma-runner/karma/issues/283
      var config = e.parseConfig('/home/config7.js', {browsers: ['Safari']})

      expect(config.browsers).to.deep.equal(['Safari'])
    })

    it('should resolve files and excludes to overriden basePath from cli', () => {
      var config = e.parseConfig('/conf/both.js', {port: 456, autoWatch: false, basePath: '/xxx'})

      expect(config.basePath).to.equal(resolveWinPath('/xxx'))
      var actual = [resolveWinPath('/xxx/one.js'), resolveWinPath('/xxx/two.js')]
      expect(patternsFrom(config.files)).to.deep.equal(actual)
      expect(config.exclude).to.deep.equal([
        resolveWinPath('/xxx/third.js'),
        resolveWinPath('/conf/both.js')
      ])
    })

    it('should normalize urlRoot config', () => {
      var config = normalizeConfigWithDefaults({urlRoot: ''})
      expect(config.urlRoot).to.equal('/')

      config = normalizeConfigWithDefaults({urlRoot: '/a/b'})
      expect(config.urlRoot).to.equal('/a/b/')

      config = normalizeConfigWithDefaults({urlRoot: 'a/'})
      expect(config.urlRoot).to.equal('/a/')

      config = normalizeConfigWithDefaults({urlRoot: 'some/thing'})
      expect(config.urlRoot).to.equal('/some/thing/')
    })

    it('should change autoWatch to false if singleRun', () => {
      // config4.js has autoWatch = true
      var config = m.parseConfig('/home/config4.js', {singleRun: true})
      expect(config.autoWatch).to.equal(false)
    })

    it('should normalize reporters to an array', () => {
      var config = m.parseConfig('/home/config6.js', {})
      expect(config.reporters).to.deep.equal(['junit'])
    })

    it('should compile coffeescript config', () => {
      var config = e.parseConfig('/conf/coffee.coffee', {})
      expect(patternsFrom(config.files)).to.deep.equal([
        resolveWinPath('/conf/one.js'),
        resolveWinPath('/conf/two.js')
      ])
    })

    it('should set defaults with coffeescript', () => {
      var config = e.parseConfig('/conf/coffee.coffee', {})
      expect(config.autoWatch).to.equal(true)
    })

    it('should not read config file, when null', () => {
      var config = e.parseConfig(null, {basePath: '/some'})

      expect(logSpy).not.to.have.been.called
      expect(config.basePath).to.equal(resolveWinPath('/some')) // overriden by CLI
      expect(config.urlRoot).to.equal('/')
    }) // default value

    it('should not read config file, when null but still resolve cli basePath', () => {
      var config = e.parseConfig(null, {basePath: './some' })

      expect(logSpy).not.to.have.been.called
      expect(config.basePath).to.equal(resolveWinPath('./some'))
      expect(config.urlRoot).to.equal('/')
    }) // default value

    it('should default unset options in client config', () => {
      var config = e.parseConfig(null, {client: {args: ['--test']}})

      expect(config.client.useIframe).to.not.be.undefined
      expect(config.client.captureConsole).to.not.be.undefined

      config = e.parseConfig(null, {client: {useIframe: true}})

      expect(config.client.args).to.not.be.undefined
      expect(config.client.captureConsole).to.not.be.undefined

      config = e.parseConfig(null, {client: {captureConsole: true}})

      expect(config.client.useIframe).to.not.be.undefined
      expect(config.client.args).to.not.be.undefined
    })
  })

  describe('normalizeConfig', () => {
    it('should convert patterns to objects and set defaults', () => {
      var config = normalizeConfigWithDefaults({
        basePath: '/base',
        files: ['a/*.js', {pattern: 'b.js', watched: false, included: false}, {pattern: 'c.js'}]
      })

      expect(config.files.length).to.equal(3)

      var file = config.files.shift()
      expect(file.pattern).to.equal(resolveWinPath('/base/a/*.js'))
      expect(file.included).to.equal(true)
      expect(file.served).to.equal(true)
      expect(file.watched).to.equal(true)

      file = config.files.shift()
      expect(file.pattern).to.equal(resolveWinPath('/base/b.js'))
      expect(file.included).to.equal(false)
      expect(file.served).to.equal(true)
      expect(file.watched).to.equal(false)

      file = config.files.shift()
      expect(file.pattern).to.equal(resolveWinPath('/base/c.js'))
      expect(file.included).to.equal(true)
      expect(file.served).to.equal(true)
      expect(file.watched).to.equal(true)
    })

    it('should normalize preprocessors to an array', () => {
      var config = normalizeConfigWithDefaults({
        basePath: '',
        preprocessors: {'/*.coffee': 'coffee',
        '/*.html': 'html2js'}
      })

      expect(config.preprocessors[resolveWinPath('/*.coffee')]).to.deep.equal(['coffee'])
      expect(config.preprocessors[resolveWinPath('/*.html')]).to.deep.equal(['html2js'])
    })

    it('should resolve relative preprocessor patterns', () => {
      var config = normalizeConfigWithDefaults({
        basePath: '/some/base',
        preprocessors: {'*.coffee': 'coffee',
        '/**/*.html': 'html2js'}
      })

      expect(config.preprocessors).to.have.property(resolveWinPath('/some/base/*.coffee'))
      expect(config.preprocessors).not.to.have.property(resolveWinPath('*.coffee'))
      expect(config.preprocessors).to.have.property(resolveWinPath('/**/*.html'))
    })
  })

  describe('createPatternObject', () => {
    it('should parse string and set defaults', () => {
      var pattern = m.createPatternObject('some/**/*.js')

      expect(typeof pattern).to.equal('object')
      expect(pattern.pattern).to.equal('some/**/*.js')
      expect(pattern.watched).to.equal(true)
      expect(pattern.included).to.equal(true)
      expect(pattern.served).to.equal(true)
    })

    it('should merge pattern object and set defaults', () => {
      var pattern = m.createPatternObject({pattern: 'a.js', included: false, watched: false})

      expect(typeof pattern).to.equal('object')
      expect(pattern.pattern).to.equal('a.js')
      expect(pattern.watched).to.equal(false)
      expect(pattern.included).to.equal(false)
      expect(pattern.served).to.equal(true)
    })

    it('should make urls not served neither watched', () => {
      var pattern = m.createPatternObject('http://some.url.com')

      expect(pattern.pattern).to.equal('http://some.url.com')
      expect(pattern.included).to.equal(true)
      expect(pattern.watched).to.equal(false)
      expect(pattern.served).to.equal(false)

      pattern = m.createPatternObject({pattern: 'https://some.other.com'})

      expect(pattern.pattern).to.equal('https://some.other.com')
      expect(pattern.included).to.equal(true)
      expect(pattern.watched).to.equal(false)
      expect(pattern.served).to.equal(false)
    })
  })

  describe('custom', () => {
    var di = require('di')

    var forwardArgsFactory = function (args) {
      return args
    }

    var baseModule =
    {'preprocessor:base': ['type', forwardArgsFactory],
      'launcher:base': ['type', forwardArgsFactory],
    'reporter:base': ['type', forwardArgsFactory]}

    it('should define a custom launcher', () => {
      var config = normalizeConfigWithDefaults({
        customLaunchers: {
          custom: {
            base: 'base',
            first: 123,
            whatever: 'aaa'
          }
        }
      })

      var injector = new di.Injector([baseModule].concat(config.plugins))
      var injectedArgs = injector.get('launcher:custom')

      expect(injectedArgs).to.be.defined
      expect(injectedArgs.first).to.equal(123)
      expect(injectedArgs.whatever).to.equal('aaa')
    })

    it('should define a custom preprocessor', () => {
      var config = normalizeConfigWithDefaults({
        customPreprocessors: {
          custom: {
            base: 'base',
            second: 123,
            whatever: 'bbb'
          }
        }
      })

      var injector = new di.Injector([baseModule].concat(config.plugins))
      var injectedArgs = injector.get('preprocessor:custom')

      expect(injectedArgs).to.be.defined
      expect(injectedArgs.second).to.equal(123)
      expect(injectedArgs.whatever).to.equal('bbb')
    })

    it('should define a custom reporter', () => {
      var config = normalizeConfigWithDefaults({
        customReporters: {
          custom: {
            base: 'base',
            third: 123,
            whatever: 'ccc'
          }
        }
      })

      var injector = new di.Injector([baseModule].concat(config.plugins))
      var injectedArgs = injector.get('reporter:custom')

      expect(injectedArgs).to.be.defined
      expect(injectedArgs.third).to.equal(123)
      expect(injectedArgs.whatever).to.equal('ccc')
    })

    it('should not create empty module', () => {
      var config = normalizeConfigWithDefaults({})
      expect(config.plugins).to.deep.equal([])
    })
  })
})

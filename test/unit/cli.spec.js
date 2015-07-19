// ==============================================================================
// lib/cli.js module
// ==============================================================================
describe('cli', function () {
  var m
  var e
  var cli = require('../../lib/cli')
  var optimist = require('optimist')
  var path = require('path')
  var constant = require('../../lib/constants')
  path = require('path')
  var mocks = require('mocks')
  var loadFile = mocks.loadFile
  var mockery = m = e = null

  var fsMock = mocks.fs.create({
    cwd: {'karma.conf.js': true},
    cwd2: {'karma.conf.coffee': true}
  })

  var currentCwd = null

  var pathMock =
  {resolve: function (p) { return path.resolve(currentCwd, p); }}

  var setCWD = function (cwd) {
    currentCwd = cwd
    return fsMock._setCWD(cwd)
  }

  var processArgs = function (args, opts) {
    var argv = optimist.parse(args)
    return e.processArgs(argv, opts || {}, fsMock, pathMock)
  }

  beforeEach(function () {
    setCWD('/')
    mockery = {}
    mockery.process = {exit: sinon.spy()}
    mockery.console = {error: sinon.spy()}

    // load file under test
    m = loadFile(__dirname + '/../../lib/cli.js', mockery, {
      global: {},
      console: mockery.console,
      process: mockery.process,
      require: function (path) {
        if (path.indexOf('./') === 0) {
          return require('../../lib/' + path)
        } else {
          return require(path)
        }
      }
    })
    return e = m.exports
  })

  describe('processArgs', function () {
    it('should override if multiple options given', function () {
      // optimist parses --port 123 --port 456 as port = [123, 456] which makes no sense
      var options = processArgs(['some.conf', '--port', '12', '--log-level', 'info', '--port', '34', '--log-level', 'debug'])

      expect(options.port).to.equal(34)
      return expect(options.logLevel).to.equal('DEBUG')
    })

    it('should return camelCased options', function () {
      var options = processArgs(['some.conf', '--port', '12', '--single-run'])

      expect(options.configFile).to.exist
      expect(options.port).to.equal(12)
      return expect(options.singleRun).to.equal(true)
    })

    it('should parse options without configFile and set default', function () {
      setCWD('/cwd')
      var options = processArgs(['--auto-watch', '--auto-watch-interval', '10'])
      expect(path.resolve(options.configFile)).to.equal(path.resolve('/cwd/karma.conf.js'))
      expect(options.autoWatch).to.equal(true)
      return expect(options.autoWatchInterval).to.equal(10)
    })

    it('should set default karma.conf.coffee config file if exists', function () {
      setCWD('/cwd2')
      var options = processArgs(['--port', '10'])

      return expect(path.resolve(options.configFile)).to.equal(path.resolve('/cwd2/karma.conf.coffee'))
    })

    it('should not set default config if neither exists', function () {
      setCWD('/')
      var options = processArgs([])

      return expect(options.configFile).to.equal(null)
    })

    it('should parse auto-watch, colors, singleRun to boolean', function () {
      var options = processArgs(['--auto-watch', 'false', '--colors', 'false', '--single-run', 'false'])

      expect(options.autoWatch).to.equal(false)
      expect(options.colors).to.equal(false)
      expect(options.singleRun).to.equal(false)

      options = processArgs(['--auto-watch', 'true', '--colors', 'true', '--single-run', 'true'])

      expect(options.autoWatch).to.equal(true)
      expect(options.colors).to.equal(true)
      return expect(options.singleRun).to.equal(true)
    })

    it('should replace log-level constants', function () {
      var options = processArgs(['--log-level', 'debug'])
      expect(options.logLevel).to.equal(constant.LOG_DEBUG)

      options = processArgs(['--log-level', 'error'])
      expect(options.logLevel).to.equal(constant.LOG_ERROR)

      options = processArgs(['--log-level', 'warn'])
      expect(options.logLevel).to.equal(constant.LOG_WARN)

      options = processArgs(['--log-level', 'foo'])
      expect(mockery.process.exit).to.have.been.calledWith(1)

      options = processArgs(['--log-level'])
      return expect(mockery.process.exit).to.have.been.calledWith(1)
    })

    it('should parse browsers into an array', function () {
      var options = processArgs(['--browsers', 'Chrome,ChromeCanary,Firefox'])
      return expect(options.browsers).to.deep.equal(['Chrome', 'ChromeCanary', 'Firefox'])
    })

    it('should resolve configFile to absolute path', function () {
      setCWD('/cwd')
      var options = processArgs(['some/config.js'])
      return expect(path.resolve(options.configFile)).to.equal(path.resolve('/cwd/some/config.js'))
    })

    it('should parse report-slower-than to a number', function () {
      var options = processArgs(['--report-slower-than', '2000'])
      expect(options.reportSlowerThan).to.equal(2000)

      options = processArgs(['--no-report-slower-than'])
      return expect(options.reportSlowerThan).to.equal(0)
    })

    it('should cast reporters to array', function () {
      var options = processArgs(['--reporters', 'dots,junit'])
      expect(options.reporters).to.deep.equal(['dots', 'junit'])

      options = processArgs(['--reporters', 'dots'])
      return expect(options.reporters).to.deep.equal(['dots'])
    })

    return it('should parse removed/added/changed files to array', function () {
      var options = processArgs([
        '--removed-files', 'r1.js,r2.js',
        '--changed-files', 'ch1.js,ch2.js',
        '--added-files', 'a1.js,a2.js'
      ])

      expect(options.removedFiles).to.deep.equal(['r1.js', 'r2.js'])
      expect(options.addedFiles).to.deep.equal(['a1.js', 'a2.js'])
      return expect(options.changedFiles).to.deep.equal(['ch1.js', 'ch2.js'])
    })
  })

  describe('parseClientArgs', function () {
    it('should return arguments after --', function () {
      var args = cli.parseClientArgs(['node', 'karma.js', 'runArg', '--flag', '--', '--foo', '--bar', 'baz'])
      return expect(args).to.deep.equal(['--foo', '--bar', 'baz'])
    })

    return it('should return empty args if -- is not present', function () {
      var args = cli.parseClientArgs(['node', 'karma.js', 'runArg', '--flag', '--foo', '--bar', 'baz'])
      return expect(args).to.deep.equal([])
    })
  })

  return describe('argsBeforeDoubleDash', function () {
    return it('should return array of args that occur before --', function () {
      var args = cli.argsBeforeDoubleDash(['aa', '--bb', 'value', '--', 'some', '--no-more'])
      return expect(args).to.deep.equal(['aa', '--bb', 'value'])
    })
  })
})

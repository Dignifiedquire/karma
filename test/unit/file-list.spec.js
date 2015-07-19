var Promise = require('bluebird')
var EventEmitter = require('events').EventEmitter
var mocks = require('mocks')
var proxyquire = require('proxyquire')
var helper = require('../../lib/helper')
var _ = helper._

var from = require('core-js/library/fn/array/from')
var config = require('../../lib/config')

// create an array of pattern objects from given strings
var patterns = (...strings) => strings.map(str => new config.Pattern(str))

var pathsFrom = function (files) {
  return _.pluck(from(files), 'path')
}

var findFile = function (path, files) {
  return from(files).find(function (file) { return file.path === path; })
}

var PATTERN_LIST =
{'/some/*.js': ['/some/a.js', '/some/b.js'],
  '*.txt': ['/c.txt', '/a.txt', '/b.txt'],
'/a.*': ['/a.txt']}

var MG = {
  statCache: {
    '/some/a.js': {mtime: new Date()},
    '/some/b.js': {mtime: new Date()},
    '/a.txt': {mtime: new Date()},
    '/b.txt': {mtime: new Date()},
    '/c.txt': {mtime: new Date()}
  }
}
var mockFs = mocks.fs.create({
  some: {'0.js': mocks.fs.file('2012-04-04'),
    'a.js': mocks.fs.file('2012-04-04'),
    'b.js': mocks.fs.file('2012-05-05'),
  'd.js': mocks.fs.file('2012-05-05')},
  folder: {'x.js': mocks.fs.file(0)},
  'a.txt': mocks.fs.file(0),
  'b.txt': mocks.fs.file(0),
  'c.txt': mocks.fs.file(0),
  'a.js': mocks.fs.file('2012-01-01')
})

describe('FileList', function () {
  var list
  var emitter
  var preprocess
  var patternList
  var mg
  var modified
  var glob
  var List = list = emitter = preprocess = patternList = mg = modified = glob = null

  beforeEach(function () {})

  describe('files', function () {
    beforeEach(function () {
      patternList = PATTERN_LIST
      mg = MG
      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()

      glob = {
        Glob: function (pattern, opts) {
          return {
            found: patternList[pattern],
            statCache: mg.statCache
          }
        }
      }

      List = proxyquire('../../lib/file-list', {
        helper: helper,
        glob: glob,
        fs: mockFs
      })
    })

    it('returns a flat array of served files', function () {
      list = new List(patterns('/some/*.js'), [], emitter, preprocess)

      return list.refresh().then(function () {
        return expect(list.files.served).to.have.length(2)
      })
    })

    it('returns a unique set', function () {
      list = new List(patterns('/a.*', '*.txt'), [], emitter, preprocess)

      return list.refresh().then(function () {
        expect(list.files.served).to.have.length(3)
        return expect(pathsFrom(list.files.served)).to.contain('/a.txt', '/b.txt', '/c.txt')
      })
    })

    it('returns only served files', function () {
      var files = [
        new config.Pattern('/a.*', true),        // served: true
        new config.Pattern('/some/*.js', false) // served: false
      ]

      list = new List(files, [], emitter, preprocess)

      return list.refresh().then(function () {
        return expect(pathsFrom(list.files.served)).to.eql(['/a.txt'])
      })
    })

    it('marks no cache files', function () {
      var files = [
        new config.Pattern('/a.*'),        // nocach: false
        new config.Pattern('/some/*.js', true, true, true, true) // nocache: true
      ]

      list = new List(files, [], emitter, preprocess)

      return list.refresh().then(function () {
        expect(pathsFrom(list.files.served)).to.deep.equal([
          '/a.txt',
          '/some/a.js',
          '/some/b.js'
        ])
        expect(preprocess).to.have.been.calledOnce
        expect(list.files.served[0].doNotCache).to.be.false
        expect(list.files.served[1].doNotCache).to.be.true
        return expect(list.files.served[2].doNotCache).to.be.true
      })
    })

    return it('returns a flat array of included files', function () {
      var files = [
        new config.Pattern('/a.*', true, false), // included: false
        new config.Pattern('/some/*.js') // included: true
      ]

      list = new List(files, [], emitter, preprocess)

      return list.refresh().then(function () {
        expect(pathsFrom(list.files.included)).not.to.contain('/a.txt')
        return expect(pathsFrom(list.files.included)).to.deep.equal([
          '/some/a.js',
          '/some/b.js'
        ])
      })
    })
  })

  describe('_isExcluded', function () {
    beforeEach(function () {
      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      return emitter = new EventEmitter()
    })

    it('returns undefined when no match is found', function () {
      list = new List([], ['hello.js', 'world.js'], emitter, preprocess)
      expect(list._isExcluded('hello.txt')).to.be.undefined
      return expect(list._isExcluded('/hello/world/i.js')).to.be.undefined
    })

    return it('returns the first match if it finds one', function () {
      list = new List([], ['*.js', '**/*.js'], emitter, preprocess)
      expect(list._isExcluded('world.js')).to.be.eql('*.js')
      return expect(list._isExcluded('/hello/world/i.js')).to.be.eql('**/*.js')
    })
  })

  describe('_isIncluded', function () {
    beforeEach(function () {
      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      return emitter = new EventEmitter()
    })

    it('returns undefined when no match is found', function () {
      list = new List(patterns('*.js'), [], emitter, preprocess)
      expect(list._isIncluded('hello.txt')).to.be.undefined
      return expect(list._isIncluded('/hello/world/i.js')).to.be.undefined
    })

    return it('returns the first match if it finds one', function () {
      list = new List(patterns('*.js', '**/*.js'), [], emitter, preprocess)
      expect(list._isIncluded('world.js').pattern).to.be.eql('*.js')
      return expect(list._isIncluded('/hello/world/i.js').pattern).to.be.eql('**/*.js')
    })
  })

  describe('_exists', function () {
    beforeEach(function () {
      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()

      glob = {
        Glob: function (pattern, opts) {
          return {
            found: patternList[pattern],
            statCache: mg.statCache
          }
        }
      }

      List = proxyquire('../../lib/file-list', {
        helper: helper,
        glob: glob,
        fs: mockFs
      })

      list = new List(patterns('/some/*.js', '*.txt'), [], emitter, preprocess)

      return list.refresh()
    })

    it('returns false when no match is found', function () {
      expect(list._exists('/some/s.js')).to.be.false
      return expect(list._exists('/hello/world.ex')).to.be.false
    })

    return it('returns true when a match is found', function () {
      expect(list._exists('/some/a.js')).to.be.true
      return expect(list._exists('/some/b.js')).to.be.true
    })
  })

  describe('refresh', function () {
    beforeEach(function () {
      patternList = _.cloneDeep(PATTERN_LIST)
      mg = _.cloneDeep(MG)
      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()

      glob = {
        Glob: function (pattern, opts) {
          return {
            found: patternList[pattern],
            statCache: mg.statCache
          }
        }
      }

      List = proxyquire('../../lib/file-list', {
        helper: helper,
        glob: glob,
        fs: mockFs
      })

      return list = new List(patterns('/some/*.js', '*.txt'), [], emitter, preprocess)
    })

    it('resolves patterns', function () {
      return list.refresh().then(function (files) {
        expect(list.buckets.size).to.equal(2)

        var first = pathsFrom(list.buckets.get('/some/*.js'))
        var second = pathsFrom(list.buckets.get('*.txt'))

        expect(first).to.contain('/some/a.js', '/some/b.js')
        return expect(second).to.contain('/a.txt', '/b.txt', '/c.txt')
      })
    })

    it('cancels refreshs', function () {
      var checkResult = function (files) {
        return expect(_.pluck(files.served, 'path')).to.contain('/some/a.js', '/some/b.js', '/some/c.js')
      }

      var p1 = list.refresh().then(checkResult)
      patternList['/some/*.js'].push('/some/c.js')
      mg.statCache['/some/c.js'] = {mtime: new Date()}
      var p2 = list.refresh().then(checkResult)

      return Promise.all([p1, p2])
    })

    it('sets the mtime for all files', function () {
      return list.refresh().then(function (files) {
        var bucket = list.buckets.get('/some/*.js')

        var file1 = findFile('/some/a.js', bucket)
        var file2 = findFile('/some/b.js', bucket)

        expect(file1.mtime).to.be.eql(mg.statCache['/some/a.js'].mtime)
        return expect(file2.mtime).to.be.eql(mg.statCache['/some/b.js'].mtime)
      })
    })

    it('sets the mtime for relative patterns', function () {
      list = new List(patterns('/some/world/../*.js', '*.txt'), [], emitter, preprocess)

      return list.refresh().then(function (files) {
        var bucket = list.buckets.get('/some/world/../*.js')

        var file1 = findFile('/some/a.js', bucket)
        var file2 = findFile('/some/b.js', bucket)

        expect(file1.mtime).to.be.eql(mg.statCache['/some/a.js'].mtime)
        return expect(file2.mtime).to.be.eql(mg.statCache['/some/b.js'].mtime)
      })
    })

    it('should sort files within buckets and keep order of patterns (buckets)', function () {
      // /a.*       => /a.txt                   [MATCH in *.txt as well]
      // /some/*.js => /some/a.js, /some/b.js   [/some/b.js EXCLUDED]
      // *.txt      => /c.txt, a.txt, b.txt     [UNSORTED]
      list = new List(patterns('/a.*', '/some/*.js', '*.txt'), ['**/b.js'], emitter, preprocess)

      return list.refresh().then(function (files) {
        return expect(pathsFrom(files.served)).to.deep.equal([
          '/a.txt',
          '/some/a.js',
          '/b.txt',
          '/c.txt'
        ])
      })
    })

    it('ingores excluded files', function () {
      list = new List(patterns('*.txt'), ['/a.*', '**/b.txt'], emitter, preprocess)

      return list.refresh().then(function (files) {
        var bucket = pathsFrom(list.buckets.get('*.txt'))

        expect(bucket).to.contain('/c.txt')
        expect(bucket).not.to.contain('/a.txt')
        return expect(bucket).not.to.contain('/b.txt')
      })
    })

    it('does not glob urls and sets the isUrl flag', function () {
      list = new List(patterns('http://some.com'), [], emitter, preprocess)

      return list.refresh()
        .then(function (files) {
          var bucket = list.buckets.get('http://some.com')
          var file = findFile('http://some.com', bucket)

          return expect(file).to.have.property('isUrl', true)
        }
      )
    })

    it('preprocesses all files', function () {
      return list.refresh().then(function (files) {
        return expect(preprocess.callCount).to.be.eql(5)
      })
    })

    return it('fails when a preprocessor fails', function () {
      preprocess = sinon.spy(function (file, next) {
        return next(new Error('failing'), null)
      })

      list = new List(patterns('/some/*.js'), [], emitter, preprocess)

      return list.refresh().catch(function (err) {
        return expect(err.message).to.be.eql('failing')
      })
    })
  })

  describe('reload', function () {
    beforeEach(function () {
      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()
      return list = new List(patterns('/some/*.js', '*.txt'), [], emitter, preprocess)
    })

    return it('refreshes, even when a refresh is already happening', function () {
      sinon.spy(list, '_refresh')

      return Promise.all([
        list.refresh(),
        list.reload(patterns('*.txt'), [])
      ])
        .then(function () {
          return expect(list._refresh).to.have.been.calledTwice
        }
      )
    })
  })

  describe('addFile', function () {
    beforeEach(function () {
      patternList = PATTERN_LIST
      mg = MG

      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()

      glob = {
        Glob: function (pattern, opts) {
          return {
            found: patternList[pattern],
            statCache: mg.statCache
          }
        }
      }
      List = proxyquire('../../lib/file-list', {
        helper: helper,
        glob: glob,
        fs: mockFs
      })

      return list = new List(patterns('/some/*.js', '*.txt'), ['/secret/*.txt'], emitter, preprocess)
    })

    it('does not add excluded files', function () {
      return list.refresh().then(function (before) {
        return list.addFile('/secret/hello.txt').then(function (files) {
          return expect(files.served).to.be.eql(before.served)
        })
      })
    })

    it('does not add already existing files', function () {
      return list.refresh().then(function (before) {
        return list.addFile('/some/a.js').then(function (files) {
          return expect(files.served).to.be.eql(before.served)
        })
      })
    })

    it('does not add unmatching files', function () {
      return list.refresh().then(function (before) {
        return list.addFile('/some/a.ex').then(function (files) {
          return expect(files.served).to.be.eql(before.served)
        })
      })
    })

    it('adds the file to the correct bucket', function () {
      return list.refresh().then(function (before) {
        return list.addFile('/some/d.js').then(function (files) {
          expect(pathsFrom(files.served)).to.contain('/some/d.js')
          var bucket = list.buckets.get('/some/*.js')
          return expect(pathsFrom(bucket)).to.contain('/some/d.js')
        })
      })
    })

    it('fires "file_list_modified"', function () {
      modified = sinon.stub()
      emitter.on('file_list_modified', modified)

      return list.refresh().then(function () {
        expect(modified).to.have.been.calledOnce
        modified.reset()

        return list.addFile('/some/d.js').then(function () {
          return expect(modified).to.have.been.calledOnce
        })
      })
    })

    it('ignores quick double "add"', function () {
      // On linux fs.watch (chokidar with usePolling: false) fires "add" event twice.
      // This checks that we only stat and preprocess the file once.

      modified = sinon.stub()
      emitter.on('file_list_modified', modified)

      return list.refresh().then(function () {
        expect(modified).to.have.been.calledOnce
        modified.reset()
        preprocess.reset()
        sinon.spy(mockFs, 'stat')

        return Promise.all([
          list.addFile('/some/d.js'),
          list.addFile('/some/d.js')
        ]).then(function () {
          expect(modified).to.have.been.calledOnce
          expect(preprocess).to.have.been.calledOnce
          return expect(mockFs.stat).to.have.been.calledOnce
        }
        )
      })
    })

    it('sets the proper mtime of the new file', function () {
      list = new List(patterns('/a.*'), [], emitter, preprocess)

      return list.refresh().then(function () {
        return list.addFile('/a.js').then(function (files) {
          return expect(findFile('/a.js', files.served).mtime).to.eql(new Date('2012-01-01'))
        })
      })
    })

    return it('preprocesses the added file', function () {
      // MATCH: /a.txt
      list = new List(patterns('/a.*'), [], emitter, preprocess)
      return list.refresh().then(function (files) {
        preprocess.reset()
        return list.addFile('/a.js').then(function () {
          expect(preprocess).to.have.been.calledOnce
          return expect(preprocess.args[0][0].originalPath).to.eql('/a.js')
        })
      })
    })
  })

  describe('changeFile', function () {
    beforeEach(function () {
      patternList = PATTERN_LIST
      mg = MG

      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()

      glob = {
        Glob: function (pattern, opts) {
          return {
            found: patternList[pattern],
            statCache: mg.statCache
          }
        }
      }

      List = proxyquire('../../lib/file-list', {
        helper: helper,
        glob: glob,
        fs: mockFs
      })

      mockFs._touchFile('/some/a.js', '2012-04-04')
      mockFs._touchFile('/some/b.js', '2012-05-05')

      modified = sinon.stub()
      return emitter.on('file_list_modified', modified)
    })

    it('updates mtime and fires "file_list_modified"', function () {
      // MATCH: /some/a.js, /some/b.js
      list = new List(patterns('/some/*.js', '/a.*'), [], emitter, preprocess)
      return list.refresh().then(function (files) {
        mockFs._touchFile('/some/b.js', '2020-01-01')
        modified.reset()

        return list.changeFile('/some/b.js').then(function (files) {
          expect(modified).to.have.been.called
          return expect(findFile('/some/b.js', files.served).mtime).to.be.eql(new Date('2020-01-01'))
        })
      })
    })

    it('does not fire "file_list_modified" if no matching file is found', function () {
      // MATCH: /some/a.js
      list = new List(patterns('/some/*.js', '/a.*'), ['/some/b.js'], emitter, preprocess)

      return list.refresh().then(function (files) {
        mockFs._touchFile('/some/b.js', '2020-01-01')
        modified.reset()

        return list.changeFile('/some/b.js').then(function () {
          return expect(modified).to.not.have.been.called
        })
      })
    })

    it('does not fire "file_list_modified" if mtime has not changed', function () {
      // chokidar on fucking windows sometimes fires event multiple times
      // MATCH: /some/a.js, /some/b.js, /a.txt
      list = new List(patterns('/some/*.js', '/a.*'), [], emitter, preprocess)

      return list.refresh().then(function (files) {
        // not touching the file, stat will return still the same
        modified.reset()
        return list.changeFile('/some/b.js').then(function () {
          return expect(modified).not.to.have.been.called
        })
      })
    })

    return it('preprocesses the changed file', function () {
      // MATCH: /some/a.js, /some/b.js
      list = new List(patterns('/some/*.js', '/a.*'), [], emitter, preprocess)

      return list.refresh().then(function (files) {
        preprocess.reset()
        mockFs._touchFile('/some/a.js', '2020-01-01')
        return list.changeFile('/some/a.js').then(function () {
          expect(preprocess).to.have.been.called
          return expect(preprocess.lastCall.args[0]).to.have.property('path', '/some/a.js')
        })
      })
    })
  })

  describe('removeFile', function () {
    beforeEach(function () {
      patternList = PATTERN_LIST
      mg = MG

      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()

      glob = {
        Glob: function (pattern, opts) {
          return {
            found: patternList[pattern],
            statCache: mg.statCache
          }
        }
      }

      List = proxyquire('../../lib/file-list', {
        helper: helper,
        glob: glob,
        fs: mockFs
      })

      modified = sinon.stub()
      return emitter.on('file_list_modified', modified)
    })

    it('removes the file from the list and fires "file_list_modified"', function () {
      // MATCH: /some/a.js, /some/b.js, /a.txt
      list = new List(patterns('/some/*.js', '/a.*'), [], emitter, preprocess)

      return list.refresh().then(function (files) {
        modified.reset()
        return list.removeFile('/some/a.js').then(function (files) {
          expect(pathsFrom(files.served)).to.be.eql([
            '/some/b.js',
            '/a.txt'
          ])
          return expect(modified).to.have.been.calledOnce
        })
      })
    })

    return it('does not fire "file_list_modified" if the file is not in the list', function () {
      // MATCH: /some/a.js, /some/b.js, /a.txt
      list = new List(patterns('/some/*.js', '/a.*'), [], emitter, preprocess)

      return list.refresh().then(function (files) {
        modified.reset()
        return list.removeFile('/a.js').then(function () {
          return expect(modified).to.not.have.been.called
        })
      })
    })
  })

  return describe('batch interval', function () {
    var clock = null

    beforeEach(function () {
      patternList = PATTERN_LIST
      mg = MG

      preprocess = sinon.spy(function (file, done) { return process.nextTick(done); })
      emitter = new EventEmitter()

      glob = {
        Glob: function (pattern, opts) {
          return {
            found: patternList[pattern],
            statCache: mg.statCache
          }
        }
      }

      modified = sinon.stub()
      emitter.on('file_list_modified', modified)

      clock = sinon.useFakeTimers()
      // This hack is needed to ensure lodash is using the fake timers
      // from sinon
      helper._ = _.runInContext()
      return List = proxyquire('../../lib/file-list', {
        helper: helper,
        glob: glob,
        fs: mockFs
      })
    })

    afterEach(function () {
      return clock.restore()
    })

    it('batches multiple changes within an interval', function (done) {
      // MATCH: /some/a.js, /some/b.js, /a.txt
      list = new List(patterns('/some/*.js', '/a.*'), [], emitter, preprocess, 1000)

      return list.refresh().then(function (files) {
        modified.reset()
        mockFs._touchFile('/some/b.js', '2020-01-01')
        list.changeFile('/some/b.js')
        list.removeFile('/some/a.js'); // /some/b.js, /a.txt
        list.removeFile('/a.txt'); // /some/b.js
        list.addFile('/a.txt'); // /some/b.js, /a.txt
        list.addFile('/some/0.js'); // /some/0.js, /some/b.js, /a.txt

        clock.tick(999)
        expect(modified).to.not.have.been.called
        emitter.once('file_list_modified', function (files) {
          expect(pathsFrom(files.served)).to.be.eql([
            '/some/0.js',
            '/some/b.js',
            '/a.txt'
          ])
          return done()
        })

        return clock.tick(1001)
      })
    })

    return it('waits while file preprocessing, if the file was deleted and immediately added', function (done) {
      list = new List(patterns('/a.*'), [], emitter, preprocess, 1000)

      return list.refresh().then(function (files) {
        preprocess.reset()

        // Remove and then immediately add file to the bucket
        list.removeFile('/a.txt')
        list.addFile('/a.txt')

        clock.tick(1000)

        emitter.once('file_list_modified', function (files) {
          expect(preprocess).to.have.been.calledOnce
          return done()
        })

        return clock.tick(1001)
      })
    })
  })
})

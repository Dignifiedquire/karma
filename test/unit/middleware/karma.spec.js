describe('middleware.karma', function () {
  var serveFile
  var filesDeferred
  var nextSpy
  var response
  var helper = require('../../../lib/helper')
  var constants = require('../../../lib/constants')

  var mocks = require('mocks')
  var HttpResponseMock = mocks.http.ServerResponse
  var HttpRequestMock = mocks.http.ServerRequest

  var File = require('../../../lib/file')
  var Url = require('../../../lib/url')

  var MockFile = function (path, sha) {
    File.call(this, path)
    return this.sha = sha || 'sha-default'
  }

  var fsMock = mocks.fs.create({
    karma: {
      static: {
        'client.html': mocks.fs.file(0, 'CLIENT HTML\n%X_UA_COMPATIBLE%%X_UA_COMPATIBLE_URL%'),
        'context.html': mocks.fs.file(0, 'CONTEXT\n%SCRIPTS%'),
        'debug.html': mocks.fs.file(0, 'DEBUG\n%SCRIPTS%\n%X_UA_COMPATIBLE%'),
        'karma.js': mocks.fs.file(0, 'root: %KARMA_URL_ROOT%, v: %KARMA_VERSION%')
      }
    }
  })

  var createServeFile = require('../../../lib/middleware/common').createServeFile
  var createKarmaMiddleware = require('../../../lib/middleware/karma').create

  var handler = serveFile = filesDeferred = nextSpy = response = null

  beforeEach(function () {
    var clientConfig = {foo: 'bar'}
    nextSpy = sinon.spy()
    response = new HttpResponseMock()
    filesDeferred = helper.defer()
    serveFile = createServeFile(fsMock, '/karma/static')
    return handler = createKarmaMiddleware(filesDeferred.promise, serveFile, '/base/path', '/__karma__/', clientConfig)
  })

  // helpers
  var includedFiles = function (files) {
    return filesDeferred.resolve({included: files, served: []})
  }

  var servedFiles = function (files) {
    return filesDeferred.resolve({included: [], served: files})
  }

  var normalizedHttpRequest = function (urlPath) {
    var req = new HttpRequestMock(urlPath)
    req.normalizedUrl = req.url
    return req
  }

  var callHandlerWith = function (urlPath, next) {
    var promise = handler(normalizedHttpRequest(urlPath), response, next || nextSpy)
    if (promise && promise.done) { promise.done(); }
  }

  it('should redirect urlRoot without trailing slash', function (done) {
    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(301, 'MOVED PERMANENTLY')
      expect(response._headers['Location']).to.equal('/__karma__/')
      return done()
    })

    return callHandlerWith('/__karma__')
  })

  it('should not serve outside of urlRoot', function () {
    handler(normalizedHttpRequest('/'), null, nextSpy)
    expect(nextSpy).to.have.been.called
    nextSpy.reset()

    handler(normalizedHttpRequest('/client.html'), null, nextSpy)
    expect(nextSpy).to.have.been.called
    nextSpy.reset()

    handler(normalizedHttpRequest('/debug.html'), null, nextSpy)
    expect(nextSpy).to.have.been.called
    nextSpy.reset()

    handler(normalizedHttpRequest('/context.html'), null, nextSpy)
    return expect(nextSpy).to.have.been.called
  })

  it('should serve client.html', function (done) {
    handler = createKarmaMiddleware(null, serveFile, '/base', '/')

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'CLIENT HTML')
      return done()
    })

    return callHandlerWith('/')
  })

  it('should serve /?id=xxx', function (done) {
    handler = createKarmaMiddleware(null, serveFile, '/base', '/')

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'CLIENT HTML')
      return done()
    })

    return callHandlerWith('/?id=123')
  })

  it('should serve /?x-ua-compatible with replaced values', function (done) {
    handler = createKarmaMiddleware(null, serveFile, '/base', '/')

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'CLIENT HTML\n<meta http-equiv="X-UA-Compatible" content="xxx=yyy"/>?x-ua-compatible=xxx%3Dyyy')
      return done()
    })

    return callHandlerWith('/?x-ua-compatible=xxx%3Dyyy')
  })

  it('should serve debug.html/?x-ua-compatible with replaced values', function (done) {
    includedFiles([])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'DEBUG\n\n<meta http-equiv="X-UA-Compatible" content="xxx=yyy"/>')
      return done()
    })

    return callHandlerWith('/__karma__/debug.html?x-ua-compatible=xxx%3Dyyy')
  })

  it('should serve karma.js with version and urlRoot variables', function (done) {
    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'root: /__karma__/, v: ' + constants.VERSION)
      expect(response._headers['Content-Type']).to.equal('application/javascript')
      return done()
    })

    return callHandlerWith('/__karma__/karma.js')
  })

  it('should serve context.html with replaced script tags', function (done) {
    includedFiles([
      new MockFile('/first.js', 'sha123'),
      new MockFile('/second.dart', 'sha456')
    ])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'CONTEXT\n<script type="text/javascript" src="/__karma__/absolute/first.js?sha123"></script>\n<script type="application/dart" src="/__karma__/absolute/second.dart?sha456"></script>')
      return done()
    })

    return callHandlerWith('/__karma__/context.html')
  })

  it('should serve context.html with replaced link tags', function (done) {
    includedFiles([
      new MockFile('/first.css', 'sha007'),
      new MockFile('/second.html', 'sha678')
    ])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'CONTEXT\n<link type="text/css" href="/__karma__/absolute/first.css?sha007" rel="stylesheet">\n<link href="/__karma__/absolute/second.html?sha678" rel="import">')
      return done()
    })

    return callHandlerWith('/__karma__/context.html')
  })

  it('should serve context.html with the correct path for the script tags', function (done) {
    includedFiles([
      new MockFile('/some/abc/a.js', 'sha'),
      new MockFile('/base/path/b.js', 'shaaa')
    ])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'CONTEXT\n<script type="text/javascript" src="/__karma__/absolute/some/abc/a.js?sha"></script>\n<script type="text/javascript" src="/__karma__/base/b.js?shaaa"></script>')
      return done()
    })

    return callHandlerWith('/__karma__/context.html')
  })

  it('should serve context.html with the correct path for link tags', function (done) {
    includedFiles([
      new MockFile('/some/abc/a.css', 'sha1'),
      new MockFile('/base/path/b.css', 'sha2'),
      new MockFile('/some/abc/c.html', 'sha3'),
      new MockFile('/base/path/d.html', 'sha4')
    ])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'CONTEXT\n<link type="text/css" href="/__karma__/absolute/some/abc/a.css?sha1" rel="stylesheet">\n<link type="text/css" href="/__karma__/base/b.css?sha2" rel="stylesheet">\n<link href="/__karma__/absolute/some/abc/c.html?sha3" rel="import">\n<link href="/__karma__/base/d.html?sha4" rel="import">')
      return done()
    })

    return callHandlerWith('/__karma__/context.html')
  })

  it('should serve context.json with the correct paths for all files', function (done) {
    includedFiles([
      new MockFile('/some/abc/a.css', 'sha1'),
      new MockFile('/base/path/b.css', 'sha2'),
      new MockFile('/some/abc/c.html', 'sha3'),
      new MockFile('/base/path/d.html', 'sha4')
    ])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, JSON.stringify({
        files: [
          '/__karma__/absolute/some/abc/a.css?sha1',
          '/__karma__/base/b.css?sha2',
          '/__karma__/absolute/some/abc/c.html?sha3',
          '/__karma__/base/d.html?sha4'
        ]
      }))
      return done()
    })

    return callHandlerWith('/__karma__/context.json')
  })

  it('should not change urls', function (done) {
    includedFiles([
      new Url('http://some.url.com/whatever')
    ])

    response.once('end', function () {
      expect(response).to.beServedAs(200, 'CONTEXT\n<script type="text/javascript" src="http://some.url.com/whatever"></script>')
      return done()
    })

    return callHandlerWith('/__karma__/context.html')
  })

  it('should send non-caching headers for context.html', function (done) {
    var ZERO_DATE = (new Date(0)).toString()

    includedFiles([])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response._headers['Cache-Control']).to.equal('no-cache')
      // idiotic IE8 needs more
      expect(response._headers['Pragma']).to.equal('no-cache')
      expect(response._headers['Expires']).to.equal(ZERO_DATE)
      return done()
    })

    return callHandlerWith('/__karma__/context.html')
  })

  it('should inline mappings with all served files', function (done) {
    fsMock._touchFile('/karma/static/context.html', 0, '%MAPPINGS%')
    servedFiles([
      new MockFile('/some/abc/a.js', 'sha_a'),
      new MockFile('/base/path/b.js', 'sha_b'),
      new MockFile('\\windows\\path\\uuu\\c.js', 'sha_c')
    ])

    response.once('end', function () {
      expect(response).to.beServedAs(200, "window.__karma__.files = {\n  '/__karma__/absolute/some/abc/a.js': 'sha_a',\n  '/__karma__/base/b.js': 'sha_b',\n  '/__karma__/absolute\\\\windows\\\\path\\\\uuu\\\\c.js': 'sha_c'\n};\n")
      return done()
    })

    return callHandlerWith('/__karma__/context.html')
  })

  it('should serve debug.html with replaced script tags without timestamps', function (done) {
    includedFiles([
      new MockFile('/first.js'),
      new MockFile('/base/path/b.js')
    ])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'DEBUG\n<script type="text/javascript" src="/__karma__/absolute/first.js"></script>\n<script type="text/javascript" src="/__karma__/base/b.js"></script>')
      return done()
    })

    return callHandlerWith('/__karma__/debug.html')
  })

  it('should serve debug.html with replaced link tags without timestamps', function (done) {
    includedFiles([
      new MockFile('/first.css'),
      new MockFile('/base/path/b.css'),
      new MockFile('/second.html'),
      new MockFile('/base/path/d.html')
    ])

    response.once('end', function () {
      expect(nextSpy).not.to.have.been.called
      expect(response).to.beServedAs(200, 'DEBUG\n<link type="text/css" href="/__karma__/absolute/first.css" rel="stylesheet">\n<link type="text/css" href="/__karma__/base/b.css" rel="stylesheet">\n<link href="/__karma__/absolute/second.html" rel="import">\n<link href="/__karma__/base/d.html" rel="import">')
      return done()
    })

    return callHandlerWith('/__karma__/debug.html')
  })

  it('should inline client config to debug.html', function (done) {
    includedFiles([
      new MockFile('/first.js')
    ])
    fsMock._touchFile('/karma/static/debug.html', 1, '%CLIENT_CONFIG%')

    response.once('end', function () {
      expect(response).to.beServedAs(200, 'window.__karma__.config = {"foo":"bar"};\n')
      return done()
    })

    return callHandlerWith('/__karma__/debug.html')
  })

  return it('should not serve other files even if they are in urlRoot', function (done) {
    includedFiles([])

    return callHandlerWith('/__karma__/something/else.js', function () {
      expect(response).to.beNotServed()
      return done()
    })
  })
})

// it 'should invoke custom handler', (done) ->
//   response.once 'end', ->
//     expect(nextSpy).not.to.have.been.called
//     expect(response.statusCode).to.equal 200
//     expect(response._content.toString()).to.equal 'Hello World'
//     done()

//   customHandler =
//     urlRegex: /\/test/,
//     handler: (request, response, staticFolder, adapterFolder, baseFolder, urlRoot) ->
//       response.end 'Hello World'

//   karmaSrcHandler = m.createKarmaSourceHandler promiseContainer, staticFolderPath,
//       adapterFolderPath, baseFolder, '/_karma_/', [customHandler], []
//   karmaSrcHandler new httpMock.ServerRequest('/_karma_/test'), response, nextSpy

// it 'should set custom script type', (done) ->
//   mocks.fs._touchFile '/karma/static/context.html', 0, 'CONTEXT\n%SCRIPTS%'
//   includedFiles [{path: 'http://some.url.com/whatever.blah', isUrl: true}]

//   response.once 'end', ->
//     expect(response._content.toString()).to.equal  'CONTEXT\n' +
//         '<script type="application/blah" src="http://some.url.com/whatever.blah"></script>'
//     expect(response.statusCode).to.equal 200
//     done()

//   customScriptType =
//     extension: 'blah',
//     contentType: 'application/blah'

//   karmaSrcHandler = m.createKarmaSourceHandler promiseContainer, staticFolderPath,
//       adapterFolderPath, baseFolder, '/_karma_/', [], [customScriptType]

//   karmaSrcHandler new httpMock.ServerRequest('/_karma_/context.html'), response, nextSpy

describe('middleware.strip_host', function () {
  var filesDeferred
  var nextSpy
  var response
  var mocks = require('mocks')
  var HttpResponseMock = mocks.http.ServerResponse
  var HttpRequestMock = mocks.http.ServerRequest

  var File = require('../../../lib/file')
  var Url = require('../../../lib/url')

  var fsMock = mocks.fs.create({
    base: {
      path: {
        'a.js': mocks.fs.file(0, 'js-src-a'),
        'index.html': mocks.fs.file(0, '<html>')
      }
    },
    src: {
      'some.js': mocks.fs.file(0, 'js-source')
    },
    'utf8ášč': {
      'some.js': mocks.fs.file(0, 'utf8-file')
    }
  })

  var serveFile = require('../../../lib/middleware/common').createServeFile(fsMock, null)
  var createStripHostMiddleware = require('../../../lib/middleware/strip_host').create

  var handler = filesDeferred = nextSpy = response = null

  beforeEach(function () {
    nextSpy = sinon.spy()
    var request = null
    return handler = createStripHostMiddleware(null, null, '/base/path')
  })

  it('should strip request with IP number', function (done) {
    var request = new HttpRequestMock('http://192.12.31.100/base/a.js?123345')
    handler(request, null, nextSpy)

    expect(request.normalizedUrl).to.equal('/base/a.js?123345')
    expect(nextSpy).to.have.been.called
    return done()
  })

  it('should strip request with absoluteURI', function (done) {
    var request = new HttpRequestMock('http://localhost/base/a.js?123345')
    handler(request, null, nextSpy)

    expect(request.normalizedUrl).to.equal('/base/a.js?123345')
    expect(nextSpy).to.have.been.called
    return done()
  })

  it('should strip request with absoluteURI and port', function (done) {
    var request = new HttpRequestMock('http://localhost:9876/base/a.js?123345')
    handler(request, null, nextSpy)

    expect(request.normalizedUrl).to.equal('/base/a.js?123345')
    expect(nextSpy).to.have.been.called
    return done()
  })

  it('should strip request with absoluteURI over HTTPS', function (done) {
    var request = new HttpRequestMock('https://karma-runner.github.io/base/a.js?123345')
    handler(request, null, nextSpy)

    expect(request.normalizedUrl).to.equal('/base/a.js?123345')
    expect(nextSpy).to.have.been.called
    return done()
  })

  return it('should return same url as passed one', function (done) {
    var request = new HttpRequestMock('/base/b.js?123345')
    handler(request, null, nextSpy)

    expect(request.normalizedUrl).to.equal('/base/b.js?123345')
    expect(nextSpy).to.have.been.called
    return done()
  })
})

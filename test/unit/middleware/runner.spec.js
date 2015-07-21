var path = require('path');
var EventEmitter = require('events').EventEmitter;
var Browser = require('../../../lib/browser');
var BrowserCollection = require('../../../lib/browser_collection');
var MultReporter = require('../../../lib/reporters/multi');
var createRunnerMiddleware = require('../../../lib/middleware/runner').create;
var mocks = require('mocks');
var HttpResponseMock = mocks.http.ServerResponse;
var HttpRequestMock = mocks.http.ServerRequest;

describe('middleware.runner', function() {
  var nextSpy;
  var response;
  var mockReporter;
  var capturedBrowsers;
  var emitter;
  var config;
  var executor;
  var handler = nextSpy = response = mockReporter = capturedBrowsers = emitter = config = null;
  var fileListMock = executor = null;

  beforeEach(function() {
    mockReporter =
      {adapters: [],
      write: function(msg) { return this.adapters.forEach(function(adapter) { return adapter(msg); }); }};

    executor =
      {schedule: function() { return emitter.emit('run_start'); }};

    emitter = new EventEmitter();
    capturedBrowsers = new BrowserCollection(emitter);
    fileListMock =
      {refresh: function() { return null; },
      addFile: function() { return null; },
      removeFile: function() { return null; },
      changeFile: function() { return null; }};

    nextSpy = sinon.spy();
    response = new HttpResponseMock();
    config = {client: {}, basePath: '/'};

    return handler = createRunnerMiddleware(emitter, fileListMock, capturedBrowsers, new MultReporter([mockReporter]), executor, 'localhost', 8877, '/', config);
  });


  it('should trigger test run and stream the reporter', function(done) {
    capturedBrowsers.add(new Browser());
    sinon.stub(capturedBrowsers, 'areAllReady', function() { return true; });

    response.once('end', function() {
      expect(nextSpy).to.not.have.been.called;
      expect(response).to.beServedAs(200, 'result\x1FEXIT0');
      return done();
    });

    handler(new HttpRequestMock('/__run__'), response, nextSpy);

    mockReporter.write('result');
    return emitter.emit('run_complete', capturedBrowsers, {exitCode: 0});
  });


  it('should not run if there is no browser captured', function(done) {
    sinon.stub(fileListMock, 'refresh');

    response.once('end', function() {
      expect(nextSpy).to.not.have.been.called;
      expect(response).to.beServedAs(200, 'No captured browser, open http://localhost:8877/\n');
      expect(fileListMock.refresh).not.to.have.been.called;
      return done();
    });

    return handler(new HttpRequestMock('/__run__'), response, nextSpy);
  });


  it('should parse body and set client.args', function(done) {
    capturedBrowsers.add(new Browser());
    sinon.stub(capturedBrowsers, 'areAllReady', function() { return true; });

    emitter.once('run_start', function() {
      expect(config.client.args).to.deep.equal(['arg1', 'arg2']);
      return done();
    });

    var RAW_MESSAGE = '{"args": ["arg1", "arg2"]}';

    var request = new HttpRequestMock('/__run__', {
      'content-type': 'application/json',
      'content-length': RAW_MESSAGE.length
    });

    handler(request, response, nextSpy);

    request.emit('data', RAW_MESSAGE);
    return request.emit('end');
  });


  it('should refresh explicit files if specified', function(done) {
    capturedBrowsers.add(new Browser());
    sinon.stub(capturedBrowsers, 'areAllReady', function() { return true; });
    sinon.stub(fileListMock, 'refresh');
    sinon.stub(fileListMock, 'addFile');
    sinon.stub(fileListMock, 'changeFile');
    sinon.stub(fileListMock, 'removeFile');

    var RAW_MESSAGE = JSON.stringify({
      addedFiles: ['/new.js'],
      removedFiles: ['/foo.js', '/bar.js'],
      changedFiles: ['/changed.js']
    });

    var request = new HttpRequestMock('/__run__', {
      'content-type': 'application/json',
      'content-length': RAW_MESSAGE.length
    });

    handler(request, response, nextSpy);

    request.emit('data', RAW_MESSAGE);
    request.emit('end');

    return process.nextTick(function() {
      expect(fileListMock.refresh).not.to.have.been.called;
      expect(fileListMock.addFile).to.have.been.calledWith(path.resolve('/new.js'));
      expect(fileListMock.removeFile).to.have.been.calledWith(path.resolve('/foo.js'));
      expect(fileListMock.removeFile).to.have.been.calledWith(path.resolve('/bar.js'));
      expect(fileListMock.changeFile).to.have.been.calledWith(path.resolve('/changed.js'));
      return done();
    });
  });

  it('should schedule execution if no refresh', function(done) {
    capturedBrowsers.add(new Browser());
    sinon.stub(capturedBrowsers, 'areAllReady', function() { return true; });

    sinon.stub(fileListMock, 'refresh');
    sinon.stub(executor, 'schedule');

    var RAW_MESSAGE = JSON.stringify({refresh: false});

    var request = new HttpRequestMock('/__run__', {
      'content-type': 'application/json',
      'content-length': RAW_MESSAGE.length
    });

    handler(request, response, nextSpy);

    request.emit('data', RAW_MESSAGE);
    request.emit('end');

    return process.nextTick(function() {
      expect(fileListMock.refresh).not.to.have.been.called;
      expect(executor.schedule).to.have.been.called;
      return done();
    });
  });


  it('should not schedule execution if refreshing and autoWatch', function(done) {
    config.autoWatch = true;

    capturedBrowsers.add(new Browser());
    sinon.stub(capturedBrowsers, 'areAllReady', function() { return true; });

    sinon.stub(fileListMock, 'refresh');
    sinon.stub(executor, 'schedule');

    handler(new HttpRequestMock('/__run__'), response, nextSpy);

    return process.nextTick(function() {
      expect(fileListMock.refresh).to.have.been.called;
      expect(executor.schedule).not.to.have.been.called;
      return done();
    });
  });


  return it('should ignore other urls', function(done) {
    return handler(new HttpRequestMock('/something'), response, function() {
      expect(response).to.beNotServed();
      return done();
    });
  });
});

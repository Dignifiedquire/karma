//==============================================================================
// lib/proxy.js module
//==============================================================================
describe('middleware.proxy', function() {
  var requestedUrl;
  var response;
  var nextSpy;
  var type;
  var httpMock = require('mocks').http;
  var loadFile = require('mocks').loadFile;

  var actualOptions = requestedUrl = response = nextSpy = type = null;

  var m = loadFile(__dirname + '/../../../lib/middleware/proxy.js');

  var mockProxies = [{
    path: '/proxy',
    baseUrl: '',
    host: 'localhost',
    port: '9000',
    proxy: {
      web: function(req, res) {
        type = 'web';
        requestedUrl = req.url;
        res.writeHead(200);
        return res.end('DONE');
      },
      ws: function(req, socket, head) {
        type = 'ws';
        return requestedUrl = req.url;
      }
    }
  }, {
    path: '/static',
    baseUrl: '',
    host: 'gstatic.com',
    port: '80',
    proxy: {
      web: function(req, res) {
        type = 'web';
        requestedUrl = req.url;
        res.writeHead(200);
        return res.end('DONE');
      },
      ws: function(req, socket, head) {
        type = 'ws';
        return requestedUrl = req.url;
      }
    }
  }, {
    path: '/sub/some',
    baseUrl: '/something',
    host: 'gstatic.com',
    port: '80',
    proxy: {
      web: function(req, res) {
        type = 'web';
        requestedUrl = req.url;
        res.writeHead(200);
        return res.end('DONE');
      },
      ws: function(req, socket, head) {
        type = 'ws';
        return requestedUrl = req.url;
      }
    }
  }, {
    path: '/sub',
    baseUrl: '',
    host: 'localhost',
    port: '9000',
    proxy: {
      web: function(req, res) {
        type = 'web';
        requestedUrl = req.url;
        res.writeHead(200);
        return res.end('DONE');
      },
      ws: function(req, socket, head) {
        type = 'ws';
        return requestedUrl = req.url;
      }
    }
  }];

  beforeEach(function() {
    actualOptions = {};
    requestedUrl = '';
    type = '';
    response = new httpMock.ServerResponse();
    return nextSpy = sinon.spy();
  });


  it('should proxy requests', function(done) {
    var proxy = m.createProxyHandler(mockProxies, true, '/', {});
    proxy(new httpMock.ServerRequest('/proxy/test.html'), response, nextSpy);

    expect(nextSpy).not.to.have.been.called;
    expect(requestedUrl).to.equal('/test.html');
    expect(type).to.equal('web');
    return done();
  });

  it('should proxy websocket requests', function(done) {
    var proxy = m.createProxyHandler(mockProxies, true, '/', {});
    proxy.upgrade(new httpMock.ServerRequest('/proxy/test.html'), response, nextSpy);

    expect(nextSpy).not.to.have.been.called;
    expect(requestedUrl).to.equal('/test.html');
    expect(type).to.equal('ws');
    return done();
  });

  it('should support multiple proxies', function() {
    var proxy = m.createProxyHandler(mockProxies, true, '/', {});
    proxy(new httpMock.ServerRequest('/static/test.html'), response, nextSpy);

    expect(nextSpy).not.to.have.been.called;
    expect(requestedUrl).to.equal('/test.html');
    return expect(type).to.equal('web');
  });

  it('should handle nested proxies', function() {
    var proxy = m.createProxyHandler(mockProxies, true, '/', {});
    proxy(new httpMock.ServerRequest('/sub/some/Test.html'), response, nextSpy);

    expect(nextSpy).not.to.have.been.called;
    expect(requestedUrl).to.equal('/something/Test.html');
    return expect(type).to.equal('web');
  });


  it('should call next handler if the path is not proxied', function() {
    var proxy = m.createProxyHandler(mockProxies, true, '/', {});
    proxy(new httpMock.ServerRequest('/non/proxy/test.html'), response, nextSpy);

    return expect(nextSpy).to.have.been.called;
  });


  it('should call next handler if no proxy defined', function() {
    var proxy = m.createProxyHandler({}, true, '/', {});
    proxy(new httpMock.ServerRequest('/non/proxy/test.html'), response, nextSpy);

    return expect(nextSpy).to.have.been.called;
  });


  it('should parse a simple proxy config', function() {
    var proxy = {'/base/': 'http://localhost:8000/'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, {});
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: '8000',
      baseUrl: '/',
      path: '/base/',
      https: false
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });

  it('should set defualt http port', function() {
    var proxy = {'/base/': 'http://localhost/'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, {});
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: '80',
      baseUrl: '/',
      path: '/base/',
      https: false
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });

  it('should set defualt https port', function() {
    var proxy = {'/base/': 'https://localhost/'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, {});
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: '443',
      baseUrl: '/',
      path: '/base/',
      https: true
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });


  it('should handle proxy configs with paths', function() {
    var proxy = {'/base': 'http://localhost:8000/proxy'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, {});
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: '8000',
      baseUrl: '/proxy',
      path: '/base',
      https: false
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });

  it('should determine protocol', function() {
    var proxy = {'/base':'https://localhost:8000'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, {});
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: '8000',
      baseUrl: '',
      path: '/base',
      https: true
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });

  it('should handle proxy configs with only basepaths', function() {
    var proxy = {'/base': '/proxy/test'};
    var config = {port: 9877, hostname: 'localhost'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, config);
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: 9877,
      baseUrl: '/proxy/test',
      path: '/base',
      https: false
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });

  it('should normalize proxy url with only basepaths', function() {
    var proxy = {'/base/': '/proxy/test'};
    var config = {port: 9877, hostname: 'localhost'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, config);
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: 9877,
      baseUrl: '/proxy/test/',
      path: '/base/',
      https: false
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });

  it('should normalize proxy url', function() {
    var proxy = {'/base/': 'http://localhost:8000/proxy/test'};
    var parsedProxyConfig = m.parseProxyConfig(proxy, {});
    expect(parsedProxyConfig).to.have.length(1);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'localhost',
      port: '8000',
      baseUrl: '/proxy/test/',
      path: '/base/',
      https: false
    });
    return expect(parsedProxyConfig[0].proxy).to.exist;
  });

  it('should parse nested proxy config', function() {
    var proxy = {
      '/sub': 'http://localhost:9000',
      '/sub/some': 'http://gstatic.com/something'
    };
    var parsedProxyConfig = m.parseProxyConfig(proxy, {});
    expect(parsedProxyConfig).to.have.length(2);
    expect(parsedProxyConfig[0]).to.containSubset({
      host: 'gstatic.com',
      port: '80',
      baseUrl: '/something',
      path: '/sub/some',
      https: false
    });
    expect(parsedProxyConfig[0].proxy).to.exist;
    expect(parsedProxyConfig[1]).to.containSubset({
      host: 'localhost',
      port: '9000',
      baseUrl: '',
      path: '/sub',
      https: false
    });
    return expect(parsedProxyConfig[1].proxy).to.exist;
  });

  return it('should handle empty proxy config', function() {
    return expect(m.parseProxyConfig({})).to.deep.equal([]);
  });
});

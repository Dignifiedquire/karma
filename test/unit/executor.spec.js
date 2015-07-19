describe('executor', function () {
  var emitter
  var capturedBrowsers
  var config
  var spy
  var Browser = require('../../lib/browser')
  var BrowserCollection = require('../../lib/browser_collection')
  var EventEmitter = require('../../lib/events').EventEmitter
  var Executor = require('../../lib/executor')

  var executor = emitter = capturedBrowsers = config = spy = null

  beforeEach(function () {
    config = {client: {}}
    emitter = new EventEmitter()
    capturedBrowsers = new BrowserCollection(emitter)
    capturedBrowsers.add(new Browser())
    executor = new Executor(capturedBrowsers, config, emitter)
    executor.socketIoSockets = new EventEmitter()

    spy =
      {onRunStart: function () { return null; },
      onSocketsExecute: function () { return null; }}

    sinon.spy(spy, 'onRunStart')
    sinon.spy(spy, 'onSocketsExecute')

    emitter.on('run_start', spy.onRunStart)
    return executor.socketIoSockets.on('execute', spy.onSocketsExecute)
  })

  it('should start the run and pass client config', function () {
    capturedBrowsers.areAllReady = function () { return true; }

    executor.schedule()
    expect(spy.onRunStart).to.have.been.called
    return expect(spy.onSocketsExecute).to.have.been.calledWith(config.client)
  })

  return it('should wait for all browsers to finish', function () {
    capturedBrowsers.areAllReady = function () { return false; }

    // they are not ready yet
    executor.schedule()
    expect(spy.onRunStart).not.to.have.been.called
    expect(spy.onSocketsExecute).not.to.have.been.called

    capturedBrowsers.areAllReady = function () { return true; }
    emitter.emit('run_complete')
    expect(spy.onRunStart).to.have.been.called
    return expect(spy.onSocketsExecute).to.have.been.called
  })
})

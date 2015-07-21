describe('launchers/base.js', function () {
  var emitter
  var _ = require('../../../lib/helper')._
  var BaseLauncher = require('../../../lib/launchers/base')
  var EventEmitter = require('../../../lib/events').EventEmitter
  var launcher = emitter = null

  beforeEach(function () {
    emitter = new EventEmitter()
    return launcher = new BaseLauncher('fake-id', emitter)
  })

  it('should manage state', function () {
    launcher.start('http://localhost:9876/')
    expect(launcher.state).to.equal(launcher.STATE_BEING_CAPTURED)

    launcher.markCaptured()
    expect(launcher.state).to.equal(launcher.STATE_CAPTURED)
    return expect(launcher.isCaptured()).to.equal(true)
  })

  describe('start', function () {
    return it('should fire "start" event and pass url with id', function () {
      var spyOnStart = sinon.spy()
      launcher.on('start', spyOnStart)
      launcher.start('http://localhost:9876/')

      return expect(spyOnStart).to.have.been.calledWith('http://localhost:9876/?id=fake-id')
    })
  })

  describe('restart', function () {
    it('should kill running browser and start with previous url', function (done) {
      var spyOnStart = sinon.spy()
      var spyOnKill = sinon.spy()
      launcher.on('start', spyOnStart)
      launcher.on('kill', spyOnKill)

      launcher.start('http://host:9988/')
      spyOnStart.reset()

      launcher.restart()
      expect(spyOnKill).to.have.been.called
      expect(spyOnStart).to.not.have.been.called

      // the process (or whatever it is) actually finished
      launcher._done()
      spyOnKill.callArg(0)

      return _.defer(function () {
        expect(spyOnStart).to.have.been.calledWith('http://host:9988/?id=fake-id')
        return done()
      })
    })

    it('should start when already finished (crashed)', function (done) {
      var spyOnStart = sinon.spy()
      var spyOnKill = sinon.spy()
      var spyOnDone = sinon.spy()
      launcher.on('start', spyOnStart)
      launcher.on('kill', spyOnKill)

      launcher.on('done', function () { return launcher.restart(); })
      launcher.on('done', spyOnDone)

      launcher.start('http://host:9988/')
      spyOnStart.reset()

      // simulate crash
      // the first onDone will restart
      launcher._done('crashed')

      return _.defer(function () {
        expect(spyOnKill).to.not.have.been.called
        expect(spyOnStart).to.have.been.called
        expect(spyOnDone).to.have.been.called
        expect(spyOnDone).to.have.been.calledBefore(spyOnStart)
        return done()
      })
    })

    return it('should not restart when being force killed', function (done) {
      var spyOnStart = sinon.spy()
      var spyOnKill = sinon.spy()
      launcher.on('start', spyOnStart)
      launcher.on('kill', spyOnKill)

      launcher.start('http://host:9988/')
      spyOnStart.reset()

      var onceKilled = launcher.forceKill()

      launcher.restart()

      // the process (or whatever it is) actually finished
      launcher._done()
      spyOnKill.callArg(0)

      return onceKilled.done(function () {
        expect(spyOnStart).to.not.have.been.called
        return done()
      })
    })
  })

  describe('kill', function () {
    it('should manage state', function (done) {
      var onceKilled = launcher.kill()
      expect(launcher.state).to.equal(launcher.STATE_BEING_KILLED)

      return onceKilled.done(function () {
        expect(launcher.state).to.equal(launcher.STATE_FINISHED)
        return done()
      })
    })

    it('should fire "kill" and wait for all listeners to finish', function (done) {
      var spyOnKill1 = sinon.spy()
      var spyOnKill2 = sinon.spy()
      var spyKillDone = sinon.spy(done)

      launcher.on('kill', spyOnKill1)
      launcher.on('kill', spyOnKill2)

      launcher.start('http://localhost:9876/')
      launcher.kill().then(spyKillDone)
      expect(spyOnKill1).to.have.been.called
      expect(spyOnKill2).to.have.been.called
      expect(spyKillDone).to.not.have.been.called

      spyOnKill1.callArg(0) // the first listener is done
      expect(spyKillDone).to.not.have.been.called

      return spyOnKill2.callArg(0)
    }) // the second listener is done

    it('should not fire "kill" if already killed', function (done) {
      var spyOnKill = sinon.spy()
      launcher.on('kill', spyOnKill)

      launcher.start('http://localhost:9876/')
      launcher.kill().then(function () {
        spyOnKill.reset()
        return launcher.kill().then(function () {
          expect(spyOnKill).to.not.have.been.called
          return done()
        })
      })

      return spyOnKill.callArg(0)
    })

    it('should not fire "kill" if already being killed, but wait for all listeners', function (done) {
      var spyOnKill = sinon.spy()
      launcher.on('kill', spyOnKill)

      var expectOnKillListenerIsAlreadyFinishedAndHasBeenOnlyCalledOnce = function () {
        expect(spyOnKill).to.have.been.called
        expect(spyOnKill.callCount).to.equal(1)
        expect(spyOnKill.finished).to.equal(true)
        return expect(launcher.state).to.equal(launcher.STATE_FINISHED)
      }

      launcher.start('http://localhost:9876/')
      var firstKilling = launcher.kill().then(function () {
        return expectOnKillListenerIsAlreadyFinishedAndHasBeenOnlyCalledOnce()
      })

      var secondKilling = launcher.kill().then(function () {
        return expectOnKillListenerIsAlreadyFinishedAndHasBeenOnlyCalledOnce()
      })

      expect(launcher.state).to.equal(launcher.STATE_BEING_KILLED)

      _.defer(function () {
        spyOnKill.finished = true
        return spyOnKill.callArg(0)
      })

      // finish the test once everything is done
      return firstKilling.done(function () { return secondKilling.done(function () { return done(); }); })
    })

    return it('should not kill already crashed browser', function (done) {
      var spyOnKill = sinon.spy(function (killDone) { return killDone(); })
      launcher.on('kill', spyOnKill)

      launcher._done('crash')
      return launcher.kill().done(function () {
        expect(spyOnKill).to.not.have.been.called
        return done()
      })
    })
  })

  describe('forceKill', function () {
    it('should cancel restart', function (done) {
      var spyOnStart = sinon.spy()
      launcher.on('start', spyOnStart)

      launcher.start('http://localhost:9876/')
      spyOnStart.reset()
      launcher.restart()

      return launcher.forceKill().done(function () {
        expect(launcher.state).to.equal(launcher.STATE_FINISHED)
        expect(spyOnStart).to.not.have.been.called
        return done()
      })
    })

    return it('should not fire "browser_process_failure" even if browser crashes', function (done) {
      var spyOnBrowserProcessFailure = sinon.spy()
      emitter.on('browser_process_failure', spyOnBrowserProcessFailure)

      launcher.on('kill', function (killDone) {
        return _.defer(function () {
          launcher._done('crashed')
          return killDone()
        })
      })

      launcher.start('http://localhost:9876/')
      return launcher.forceKill().done(function () {
        expect(spyOnBrowserProcessFailure).to.not.have.been.called
        return done()
      })
    })
  })

  describe('markCaptured', function () {
    return it('should not mark capture when killing', function () {
      launcher.kill()
      launcher.markCaptured()
      return expect(launcher.state).to.not.equal(launcher.STATE_CAPTURED)
    })
  })

  return describe('_done', function () {
    it('should emit "browser_process_failure" if there is an error', function () {
      var spyOnBrowserProcessFailure = sinon.spy()
      emitter.on('browser_process_failure', spyOnBrowserProcessFailure)

      launcher._done('crashed')
      expect(spyOnBrowserProcessFailure).to.have.been.called
      return expect(spyOnBrowserProcessFailure).to.have.been.calledWith(launcher)
    })

    return it('should not emit "browser_process_failure" when no error happend', function () {
      var spyOnBrowserProcessFailure = sinon.spy()
      emitter.on('browser_process_failure', spyOnBrowserProcessFailure)

      launcher._done()
      return expect(spyOnBrowserProcessFailure).not.to.have.been.called
    })
  })
})

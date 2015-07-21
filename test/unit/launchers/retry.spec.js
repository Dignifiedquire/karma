describe('launchers/retry.js', function() {
  var timer;
  var emitter;
  var _ = require('../../../lib/helper')._;
  var BaseLauncher = require('../../../lib/launchers/base');
  var RetryLauncher = require('../../../lib/launchers/retry');
  var EventEmitter = require('../../../lib/events').EventEmitter;
  var createMockTimer = require('../mocks/timer');
  var launcher = timer = emitter = null;

  beforeEach(function() {
    timer = createMockTimer();
    emitter = new EventEmitter();
    return launcher = new BaseLauncher('fake-id', emitter);
  });


  it('should restart if browser crashed', function(done) {
    RetryLauncher.call(launcher, 2);

    launcher.start('http://localhost:9876');

    sinon.spy(launcher, 'start');
    var spyOnBrowserProcessFailure = sinon.spy();
    emitter.on('browser_process_failure', spyOnBrowserProcessFailure);

    // simulate crash
    launcher._done('crash');

    return _.defer(function() {
      expect(launcher.start).to.have.been.called;
      expect(spyOnBrowserProcessFailure).not.to.have.been.called;
      return done();
    });
  });


  it('should eventually fail with "browser_process_failure"', function(done) {
    RetryLauncher.call(launcher, 2);

    launcher.start('http://localhost:9876');

    sinon.spy(launcher, 'start');
    var spyOnBrowserProcessFailure = sinon.spy();
    emitter.on('browser_process_failure', spyOnBrowserProcessFailure);

    // simulate first crash
    launcher._done('crash');

    return _.defer(function() {
      expect(launcher.start).to.have.been.called;
      expect(spyOnBrowserProcessFailure).not.to.have.been.called;
      launcher.start.reset();

      // simulate second crash
      launcher._done('crash');

      return _.defer(function() {
        expect(launcher.start).to.have.been.called;
        expect(spyOnBrowserProcessFailure).not.to.have.been.called;
        launcher.start.reset();

        // simulate third crash
        launcher._done('crash');

        return _.defer(function() {
          expect(launcher.start).not.to.have.been.called;
          expect(spyOnBrowserProcessFailure).to.have.been.called;
          return done();
        });
      });
    });
  });


  return it('should not restart if killed normally', function(done) {
    RetryLauncher.call(launcher, 2);

    launcher.start('http://localhost:9876');

    sinon.spy(launcher, 'start');
    var spyOnBrowserProcessFailure = sinon.spy();
    emitter.on('browser_process_failure', spyOnBrowserProcessFailure);

    // process just exited normally
    launcher._done();

    return _.defer(function() {
      expect(launcher.start).not.to.have.been.called;
      expect(spyOnBrowserProcessFailure).not.to.have.been.called;
      expect(launcher.state).to.equal(launcher.STATE_FINISHED);
      return done();
    });
  });
});

describe('launchers/capture_timeout.js', function() {
  var timer;
  var BaseLauncher = require('../../../lib/launchers/base');
  var CaptureTimeoutLauncher = require('../../../lib/launchers/capture_timeout');
  var createMockTimer = require('../mocks/timer');
  var launcher = timer = null;

  beforeEach(function() {
    timer = createMockTimer();
    launcher = new BaseLauncher('fake-id');

    return sinon.spy(launcher, 'kill');
  });


  it('should kill if not captured in captureTimeout', function() {
    CaptureTimeoutLauncher.call(launcher, timer, 10);

    launcher.start();
    timer.wind(20);
    return expect(launcher.kill).to.have.been.called;
  });


  it('should not kill if browser got captured', function() {
    CaptureTimeoutLauncher.call(launcher, timer, 10);

    launcher.start();
    launcher.markCaptured();
    timer.wind(20);
    return expect(launcher.kill).not.to.have.been.called;
  });


  it('should not do anything if captureTimeout = 0', function() {
    CaptureTimeoutLauncher.call(launcher, timer, 0);

    launcher.start();
    timer.wind(20);
    return expect(launcher.kill).not.to.have.been.called;
  });


  return it('should clear timeout between restarts', function(done) {
    CaptureTimeoutLauncher.call(launcher, timer, 10);

    // simulate process finished
    launcher.on('kill', function(onKillDone) {
      launcher._done();
      return onKillDone();
    });

    launcher.start();
    timer.wind(8);
    return launcher.kill().done(function() {
      launcher.kill.reset();
      launcher.start();
      timer.wind(8);
      expect(launcher.kill).not.to.have.been.called;
      return done();
    });
  });
});

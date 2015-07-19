// ==============================================================================
// lib/emitter_wrapper.js module
// ==============================================================================
describe('emitter_wrapper', function () {
  var EmitterWrapper = require('../../lib/emitter_wrapper')
  var events = require('events')
  var EventEmitter = events.EventEmitter

  var emitter = null
  var wrapped = null
  var called = false

  beforeEach(function () {
    emitter = new EventEmitter()
    emitter.aMethod = function (e) { return called = true; }
    emitter.on('anEvent', emitter.aMethod)
    return wrapped = new EmitterWrapper(emitter)
  })

  // ===========================================================================
  // wrapper.addListener
  // ===========================================================================
  describe('addListener', function () {
    var aListener = function (e) { return true; }

    it('should add a listener to the wrapped emitter', function () {
      wrapped.addListener('anEvent', aListener)
      return expect(emitter.listeners('anEvent')).to.contain(aListener)
    })

    return it('returns the wrapped emitter', function () {
      return expect(wrapped.addListener('anEvent', aListener)).to.equal(wrapped)
    })
  })

  // ===========================================================================
  // wrapper.removeAllListeners
  // ===========================================================================
  return describe('removeAllListeners', function () {
    var aListener = function (e) { return true; }

    beforeEach(function () {
      return wrapped.addListener('anEvent', aListener)
    })

    it('should remove listeners that were attached via the wrapper', function () {
      wrapped.removeAllListeners()
      return expect(emitter.listeners('anEvent')).not.to.contain(aListener)
    })

    it('should not remove listeners that were attached to the original emitter', function () {
      wrapped.removeAllListeners()
      return expect(emitter.listeners('anEvent')).to.contain(emitter.aMethod)
    })

    it('should remove only matching listeners when called with an event name', function () {
      var anotherListener = function (e) { return true; }
      wrapped.addListener('anotherEvent', anotherListener)
      wrapped.removeAllListeners('anEvent')
      expect(emitter.listeners('anEvent')).not.to.contain(aListener)
      return expect(emitter.listeners('anotherEvent')).to.contain(anotherListener)
    })

    return it('returns the wrapped emitter', function () {
      return expect(wrapped.addListener('anEvent', aListener)).to.equal(wrapped)
    })
  })
})

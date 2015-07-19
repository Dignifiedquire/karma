// ==============================================================================
// lib/events.js module
// ==============================================================================
describe('events', function () {
  var e = require('../../lib/events')
  var emitter = null

  beforeEach(function () {
    return emitter = new e.EventEmitter()
  })

  // ============================================================================
  // events.EventEmitter
  // ============================================================================
  describe('EventEmitter', function () {
    it('should emit events', function () {
      var spy = sinon.spy()

      emitter.on('abc', spy)
      emitter.emit('abc')
      return expect(spy).to.have.been.called
    })

    // ==========================================================================
    // events.EventEmitter.bind()
    // ==========================================================================
    describe('bind', function () {
      var object = null

      beforeEach(function () {
        object = sinon.stub({
          onFoo: function () {},
          onFooBar: function () {},
          foo: function () {},
          bar: function () {}
        })
        return emitter.bind(object)
      })

      it('should register all "on" methods to events', function () {
        emitter.emit('foo')
        expect(object.onFoo).to.have.been.called

        emitter.emit('foo_bar')
        expect(object.onFooBar).to.have.been.called

        expect(object.foo).not.to.have.been.called
        return expect(object.bar).not.to.have.been.called
      })

      return it('should bind methods to the owner object', function () {
        emitter.emit('foo')
        emitter.emit('foo_bar')

        expect(object.onFoo).to.have.always.been.calledOn(object)
        expect(object.onFooBar).to.have.always.been.calledOn(object)
        expect(object.foo).not.to.have.been.called
        return expect(object.bar).not.to.have.been.called
      })
    })

    // ==========================================================================
    // events.EventEmitter.emitAsync()
    // ==========================================================================
    return describe('emitAsync', function () {
      var object = null

      beforeEach(function () {
        object = sinon.stub({
          onFoo: function () {},
          onFooBar: function () {},
          foo: function () {},
          bar: function () {}
        })
        return emitter.bind(object)
      })

      it('should resolve the promise once all listeners are done', function (done) {
        var callbacks = []
        var eventDone = sinon.spy()

        emitter.on('a', function (d) { return d(); })
        emitter.on('a', function (d) { return callbacks.push(d); })
        emitter.on('a', function (d) { return callbacks.push(d); })

        var promise = emitter.emitAsync('a')

        expect(eventDone).not.to.have.been.called
        callbacks.pop()()
        expect(eventDone).not.to.have.been.called
        callbacks.pop()()

        return promise.then(function () {
          eventDone()
          expect(eventDone).to.have.been.called
          return done()
        })
      })

      return it('should resolve asynchronously when no listener', function (done) {
        var spyDone = sinon.spy(done)
        emitter.emitAsync('whatever').then(spyDone)
        return expect(spyDone).to.not.have.been.called
      })
    })
  })

  // ============================================================================
  // events.bindAll
  // ============================================================================
  describe('bindAll', function () {
    it('should take emitter as second argument', function () {
      var object = sinon.stub({onFoo: function () {}})

      e.bindAll(object, emitter)
      emitter.emit('foo')
      emitter.emit('bar')

      return expect(object.onFoo).to.have.been.called
    })

    return it('should append "context" to event arguments', function () {
      var object = sinon.stub({onFoo: function () {}})

      e.bindAll(object, emitter)
      emitter.emit('foo', 'event-argument')

      return expect(object.onFoo).to.have.been.calledWith('event-argument', emitter)
    })
  })

  // ============================================================================
  // events.bufferEvents
  // ============================================================================
  return describe('bufferEvents', function () {
    it('should reply all events', function () {
      var spy = sinon.spy()
      var replyEvents = e.bufferEvents(emitter, ['foo', 'bar'])

      emitter.emit('foo', 'foo-1')
      emitter.emit('bar', 'bar-2')
      emitter.emit('foo', 'foo-3')

      emitter.on('foo', spy)
      emitter.on('bar', spy)

      replyEvents()
      expect(spy).to.have.been.calledThrice
      expect(spy.firstCall).to.have.been.calledWith('foo-1')
      expect(spy.secondCall).to.have.been.calledWith('bar-2')
      return expect(spy.thirdCall).to.have.been.calledWith('foo-3')
    })

    it('should not buffer after reply()', function () {
      var spy = sinon.spy()
      var replyEvents = e.bufferEvents(emitter, ['foo', 'bar'])
      replyEvents()

      emitter.emit('foo', 'foo-1')
      emitter.emit('bar', 'bar-2')
      emitter.emit('foo', 'foo-3')

      emitter.on('foo', spy)
      emitter.on('bar', spy)

      replyEvents()
      return expect(spy).to.not.have.been.caleed
    })

    return it('should work with overriden "emit" method', function () {
      // This is to make sure it works with socket.io sockets,
      // which overrides the emit() method to send the event through the wire,
      // instead of local emit.
      var originalEmit = emitter.emit
      emitter.emit = function () { return null; }

      var spy = sinon.spy()
      var replyEvents = e.bufferEvents(emitter, ['foo'])

      originalEmit.apply(emitter, ['foo', 'whatever'])

      emitter.on('foo', spy)

      replyEvents()
      return expect(spy).to.have.been.calledWith('whatever')
    })
  })
})

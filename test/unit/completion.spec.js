// ==============================================================================
// lib/completion.js module
// ==============================================================================
describe('completion', function () {
  var c = require('../../lib/completion')
  var completion = null

  var mockEnv = function (line) {
    var words = line.split(' ')

    return {words: words,
      count: words.length,
      last: words[words.length - 1],
    prev: words[words.length - 2]}
  }

  beforeEach(function () {
    sinon.stub(console, 'log', function (msg) { return completion.push(msg); })
    return completion = []
  })

  describe('opositeWord', function () {
    it('should handle --no-x args', function () {
      return expect(c.opositeWord('--no-single-run')).to.equal('--single-run')
    })

    it('should handle --x args', function () {
      return expect(c.opositeWord('--browsers')).to.equal('--no-browsers')
    })

    return it('should ignore args without --', function () {
      return expect(c.opositeWord('start')).to.equal(null)
    })
  })

  describe('sendCompletion', function () {
    it('should filter only words matching last typed partial', function () {
      c.sendCompletion(['start', 'init', 'run'], mockEnv('in'))
      return expect(completion).to.deep.equal(['init'])
    })

    it('should filter out already used words/args', function () {
      c.sendCompletion(['--single-run', '--port', '--xxx'], mockEnv('start --single-run '))
      return expect(completion).to.deep.equal(['--port', '--xxx'])
    })

    return it('should filter out already used oposite words', function () {
      c.sendCompletion(['--auto-watch', '--port'], mockEnv('start --no-auto-watch '))
      return expect(completion).to.deep.equal(['--port'])
    })
  })

  return describe('complete', function () {
    return it('should complete the basic commands', function () {
      c.complete(mockEnv(''))
      expect(completion).to.deep.equal(['start', 'init', 'run'])

      completion.length = 0 // reset
      c.complete(mockEnv('s'))
      return expect(completion).to.deep.equal(['start'])
    })
  })
})

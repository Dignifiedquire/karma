describe('init/StateMachine', function () {
  var done
  var StateMachine = require('../../../lib/init/state_machine')
  var machine = done = null

  var mockRli =
  {close: function () { return null; },
    write: function () { return null; },
    prompt: function () { return null; },
    _deleteLineLeft: function () { return null; },
  _deleteLineRight: function () { return null; }}

  var mockColors =
  {question: function () { return ''; }}

  beforeEach(function () {
    machine = new StateMachine(mockRli, mockColors)
    return done = sinon.spy()
  })

  it('should go through all the questions', function () {
    var questions = [
      {id: 'framework', options: ['jasmine', 'mocha']},
      {id: 'other'}
    ]

    done = sinon.spy(function (answers) {
      expect(answers.framework).to.equal('jasmine')
      return expect(answers.other).to.equal('abc')
    })

    machine.process(questions, done)
    machine.onLine('jasmine')
    machine.onLine('abc')
    return expect(done).to.have.been.called
  })

  it('should allow multiple answers', function () {
    var questions = [
      {id: 'browsers', multiple: true}
    ]

    done = sinon.spy(function (answers) {
      return expect(answers.browsers).to.deep.equal(['Chrome', 'Safari'])
    })

    machine.process(questions, done)
    machine.onLine('Chrome')
    machine.onLine('Safari')
    machine.onLine('')
    return expect(done).to.have.been.called
  })

  it('should treat spaces as confirmation of multiple answers', function () {
    var questions = [
      {id: 'browsers', multiple: true}
    ]

    done = sinon.spy(function (answers) {
      return expect(answers.browsers).to.deep.equal(['Chrome'])
    })

    machine.process(questions, done)
    machine.onLine('Chrome')
    machine.onLine(' ')
    return expect(done).to.have.been.called
  })

  it('should always return array for multiple', function () {
    var questions = [
      {id: 'empty', multiple: true}
    ]

    done = sinon.spy(function (answers) {
      return expect(answers.empty).to.deep.equal([])
    })

    machine.process(questions, done)
    machine.onLine('')
    return expect(done).to.have.been.called
  })

  it('should validate answers', function () {
    var validator = sinon.spy()
    var questions = [
      {id: 'validated', validate: validator}
    ]

    machine.process(questions, done)
    machine.onLine('something')

    expect(done).to.have.been.called
    return expect(validator).to.have.been.calledWith('something')
  })

  it('should allow conditional answers', function () {
    var ifTrue = sinon.spy(function (answers) {
      return answers.first === 'true'
    })
    var ifFalse = sinon.spy(function (answers) {
      return answers.first === 'false'
    })

    done = sinon.spy(function (answers) {
      expect(answers.first).to.equal('true')
      expect(answers.onlyIfTrue).to.equal('something')
      return expect(answers.onlyIfFalse).to.not.exist
    })

    var questions = [
      {id: 'first'},
      {id: 'onlyIfTrue', condition: ifTrue},
      {id: 'onlyIfFalse', condition: ifFalse}
    ]

    machine.process(questions, done)
    machine.onLine('true')
    machine.onLine('something')

    return expect(done).to.have.been.called
  })

  it('should parse booleans', function () {
    done = sinon.spy(function (answers) {
      expect(answers.yes).to.equal(true)
      return expect(answers.no).to.equal(false)
    })

    var questions = [
      {id: 'yes', options: ['yes', 'no'], boolean: true},
      {id: 'no', options: ['yes', 'no'], boolean: true}
    ]

    machine.process(questions, done)
    machine.onLine('yes')
    machine.onLine('no')

    return expect(done).to.have.been.called
  })

  return it('should parse booleans before validation', function () {
    var validator = sinon.spy(function (value) {
      return expect(typeof value).to.equal('boolean')
    })

    var questions = [
      {id: 'what', options: ['yes', 'no'], boolean: true, validate: validator},
      {id: 'really', options: ['yes', 'no'], boolean: true, validate: validator}
    ]

    machine.process(questions, done)
    machine.onLine('yes')
    machine.onLine('no')

    return expect(validator).to.have.been.calledTwice
  })
})

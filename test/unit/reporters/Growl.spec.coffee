#==============================================================================
# lib/reporters/Growl.js module
#==============================================================================
describe 'reporter', ->
  loadFile = require('mocks').loadFile
  m = growlSpy = null

  beforeEach ->
    growlSpy = jasmine.createSpy global, 'growl'
    m = loadFile __dirname + '/../../../lib/reporters/Growl.js'#, { growl: growlSpy}

  describe 'Growl', ->
    reporter = null

    beforeEach ->
      reporter = new m.GrowlReporter null, null


    it 'display a message', ->
      reporter.write 'some'
      expect(growlSpy).toHaveBeenCalledWith 'some'

    

#==============================================================================
# lib/reporters/Base.js module
#==============================================================================
describe 'reporter', ->
  loadFile = require('mocks').loadFile
  m = b = browserMock = null

  beforeEach ->
    m = loadFile __dirname + '/../../../lib/reporters/Base.js'
    b = loadFile __dirname + '/../../../lib/browser.js'
    browserMock = new b.Browser('Browser', null, null)
    resultMock = new b.Result()
    resultMock.total = 6
    resultMock.skipped = 1
    resultMock.failed = 2
    resultMock.success = 3
    resultMock.netTime = 3
    resultMock.totalTime = 5   
    browserMock.lastResult = resultMock

  describe 'Base', ->
    adapter = reporter = null

    beforeEach ->
      
      adapter = jasmine.createSpy 'STDOUT'
      reporter = new m.BaseReporter null, null, adapter


    it 'should write to all registered adapters', ->
      anotherAdapter = jasmine.createSpy 'ADAPTER2'
      reporter.adapters.push anotherAdapter

      reporter.write 'some'
      expect(adapter).toHaveBeenCalledWith 'some'
      expect(anotherAdapter).toHaveBeenCalledWith 'some'


    it 'should format', ->
      reporter.write 'Success: %d Failure: %d', 10, 20

      expect(adapter).toHaveBeenCalledWith 'Success: 10 Failure: 20'

    it 'should display the execution ratio', ->
      msg = reporter.renderBrowser(browserMock)
      expect(msg).toMatch /Executed 5 of 6/

    it 'should display the number of failed specs', ->
      msg = reporter.renderBrowser(browserMock)
      expect(msg).toMatch /(2 FAILED)/

    it 'should display the number of skipped specs', ->
      msg = reporter.renderBrowser(browserMock)
      expect(msg).toMatch /(skipped 1)/

    it 'should display the execution time ration', ->
      msg = reporter.renderBrowser(browserMock)
      expect(msg).toMatch /(0.005 secs \/ 0.003 secs)/


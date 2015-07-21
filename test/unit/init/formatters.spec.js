// ==============================================================================
// lib/init/formatters.js module
// ==============================================================================
describe('init/formatters', function () {
  var f = require('../../../lib/init/formatters')
  var formatter = null

  return describe('JavaScript', function () {
    beforeEach(function () {
      return formatter = new f.JavaScript()
    })

    return describe('formatAnswers', function () {
      var createAnswers = function (ans) {
        ans = ans || {}
        ans.frameworks = ans.frameworks || []
        ans.files = ans.files || []
        ans.onlyServedFiles = ans.onlyServedFiles || []
        ans.exclude = ans.exclude || []
        ans.browsers = ans.browsers || []
        ans.preprocessors = ans.preprocessors || {}
        return ans
      }

      it('should format FRAMEWORKS', function () {
        var replacements = formatter.formatAnswers(createAnswers({frameworks: ['jasmine', 'requirejs']}))
        return expect(replacements.FRAMEWORKS).to.equal("'jasmine', 'requirejs'")
      })

      it('should format FILES', function () {
        var replacements = formatter.formatAnswers(createAnswers())
        expect(replacements.FILES).to.equal('')

        replacements = formatter.formatAnswers(createAnswers({files: ['*.js', 'other/file.js']}))
        return expect(replacements.FILES).to.equal("\n      '*.js',\n      'other/file.js'")
      })

      it('should format BROWSERS', function () {
        var replacements = formatter.formatAnswers(createAnswers({browsers: ['Chrome', 'Firefox']}))
        return expect(replacements.BROWSERS).to.equal("'Chrome', 'Firefox'")
      })

      it('should format AUTO_WATCH', function () {
        var replacements = formatter.formatAnswers(createAnswers({autoWatch: true}))
        expect(replacements.AUTO_WATCH).to.equal('true')

        replacements = formatter.formatAnswers(createAnswers({autoWatch: false}))
        return expect(replacements.AUTO_WATCH).to.equal('false')
      })

      it('should format onlyServedFiles', function () {
        var replacements = formatter.formatAnswers(createAnswers({
          files: ['test-main.js'],
          onlyServedFiles: ['src/*.js']
        }))

        return expect(replacements.FILES).to.equal("\n      'test-main.js',\n      {pattern: 'src/*.js', included: false}")
      })

      return it('should format PREPROCESSORS', function () {
        var replacements = formatter.formatAnswers(createAnswers({preprocessors: {'*.coffee': ['coffee']}}))

        return expect(replacements.PREPROCESSORS).to.equal("{\n      '*.coffee': ['coffee']\n    }")
      })
    })
  })
})

bs = require('browserstack')

client = bs.createClient
  username: 'dignifiedquire@gmail.com'
  password: 'mylife33'

# client.getBrowsers (err, browsers) ->
#   console.log err if err
#   for browser in browsers
#     if browser.browser
#       console.log "#{browser.os}: #{browser.browser}"
#     else
#       console.log "#{browser.os}: #{browser.device}"




parse = (id) ->
  parts = id.split '::'
  [prefix, browser, version] = parts


console.log parse 'BS::Firefox::15.0'
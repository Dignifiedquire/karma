bs = require('browserstack')

client = bs.createClient
  username: 'dignifiedquire@gmail.com'
  password: 'mylife33'

browsers = {}

client.getBrowsers (err, browsers) ->
  console.log err if err
  console.log JSON.stringify browsers



parse = (id) ->
  parts = id.split '::'
  [prefix, browser, version] = parts


console.log parse 'BS::Firefox::15.0'
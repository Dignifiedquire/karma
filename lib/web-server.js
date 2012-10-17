var http = require('http');
var path = require('path');
var static = require('node-static');
var httpProxy = require('http-proxy');
var util = require('util');
var fs = require('fs');
var router = require('director').http.Router();

var log = require('./logger').create('web server');
var proxy = require('./proxy');
var u = require('./util');


// Files that are served 
//  static/
//    - client.html
//    - context.html
//    - runner.html
//    - debug.html
//    - testacular.js
//
//  adapter/*.js
//  adapter/lib/*.js
// 
// files from fileList

// Files that need to be processed via nunjucks
//  - static/testacular.js
//  - static/context.html
//  - static/debug.html

// accepted urls
//   /
//   /_testacular_/
//   /adapter/
//   /absolute/
//   /base/

// serve source files with timestamps with cache header
// serve source files without timestamps without cache header


// use node-http-proxy to proxy requests if one is specified

// create static file servers for
//  /static/
//  /adapters/
//  /basePath/



// match urls in the following order
//   _testacular_/*  -> /static/*
//   adapter/*       -> /adapters/*
//   base/*          -> /basePath/*
//   absolute/*      -> /*
//   *               -> /*
//   *               -> proxy/*
//
// 

var testacularFiles = new(static.Server)(staticPath, defaultSettings);

//    - client.html
//    - context.html
//    - runner.html
//    - debug.html
//    - testacular.js

// router using director

router.path(urlRoot, function(){
  this.get('/_testacular_/:file', function(file){
    
    // handle preprocessing via nunjucks
    var preprocess = ['testacular.js', 'context.html', 'debug.html'];
    if (preprocess.indexOf(file) > -1) {
      
    };
    
    testacularFiles.serveFile(file, request, response);
  });

});






/**
 * Factory method for the handler of the webserver
 * @param {List} fileList - The list of file objects that are 
 * @param {String} staticPath - The path to the static files
 * @param {String} adapterPath - The path to the adapters
 * @param {String} basePath - The base path based from config.basePath
 * @param {Array} proxies - A list of proxies
 * @param {String} urlRoot - 
 * @return {Function}
 *
 */
var createHandler = function(fileList, staticPath, adapterPath, basePath, proxies, urlRoot) {
  

  // no cache headers
  var noCacheHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': (new Date(0)).toString()
  };

  // defaults for the static server
  var defaultSettings = {
    serverInfo: 'testacular'
  };

  // static file servers
  var testacularFiles = new(static.Server)(staticPath, defaultSettings);
  var adapterFiles = new(static.Server)(adapterPath, defaultSettings);
  var sourceFiles = new(static.Server)(basePath, defaultSettings);
  

  return function(request, response) {
    
    if (serveTestacularFiles(request, response)) {
      return;
    }
    if (serveAdapterFiles(request, response)) {
      return;
    }
  };

};
var serveTestacularFiles = function(request, response){
  var filePath = request.url;
  
  // Missing: test for _testacular_ in path etc

  var promise = testacularFiles.serveFile(filePath, 200, {}, request, response);
  promise.addListener('end', function(error, result){
    if (error) {
      return false;
    }
    return true;
  });
  
};

/**
 * Factory method for the webserver
 * @param {List} fileList - The list of file objects that are 
 * @param {String} basePath - The base path based from config.basePath
 * @param {Array} proxies - A list of proxies
 * @param {String} urlRoot - 
 * @return {Function}
 */
var createWebServer = function(fileList, basePath, proxies, urlRoot) {

  var staticPath = path.join(__dirname, '..', 'static');
  var adapterPath = path.join(__dirname, '..', 'adapter');

  return http.createServer(createHandler(fileList, staticPath, adapterPath, basePath, proxies, urlRoot));
  
};


// Publish
exports.createWebServer = createWebServer;


// var SCRIPT_TAG = '<script type="text/javascript" src="%s"></script>';
// var MIME_TYPE = {
//   txt: 'text/plain',
//   html: 'text/html',
//   js: 'application/javascript'
// };

// var setNoCacheHeaders = function(response) {
//   response.setHeader('Cache-Control', 'no-cache');
//   response.setHeader('Pragma', 'no-cache');
//   response.setHeader('Expires', (new Date(0)).toString());
// };


// exports.createWebServer = function (fileList, baseFolder, proxies, urlRoot) {
//   var staticFolder = path.normalize(__dirname + '/../static');
//   var adapterFolder = path.normalize(__dirname + '/../adapter');

//   return http.createServer(createHandler(fileList, u.normalizeWinPath(staticFolder),
//                                          u.normalizeWinPath(adapterFolder), baseFolder,
//                                          new httpProxy.RoutingProxy({changeOrigin: true}), proxies, urlRoot));
// };

// var createHandler = function(fileList, staticFolder, adapterFolder, baseFolder, proxyFn, proxies, urlRoot) {
//   var testacularSrcHandler = createTestacularSourceHandler(fileList, staticFolder, adapterFolder, baseFolder, urlRoot);
//   var proxiedPathsHandler = proxy.createProxyHandler(proxyFn, proxies);
//   var sourceFileHandler = createSourceFileHandler(fileList, adapterFolder, baseFolder);
//   return function(request, response) {
//     if (testacularSrcHandler(request, response)) {
//       return;
//     }
//     if (sourceFileHandler(request, response)) {
//       return;
//     }
//     if (proxiedPathsHandler(request, response)) {
//       return;
//     }
//     response.writeHead(404);
//     return response.end('NOT FOUND');
//   };
// };

// var serveStaticFile = function(file, response, process) {
//   fs.readFile(file, function(error, data) {
//     if (error) {
//       log.warn('404: ' + file);
//       response.writeHead(404);
//       return response.end('NOT FOUND');
//     }

//     // set content type
//     response.setHeader('Content-Type', MIME_TYPE[file.split('.').pop()] || MIME_TYPE.txt);

//     // call custom process fn to transform the data
//     var responseData = process && process(data.toString(), response) || data;
//     response.writeHead(200);

//     log.debug('serving: ' + file);
//     return response.end(responseData);
//   });
// };


// var createTestacularSourceHandler = function(fileList, staticFolder, adapterFolder, baseFolder, urlRoot) {
//   return function(request, response) {
//     var requestUrl = request.url.replace(/\?.*/, '');

//     if (requestUrl === urlRoot.substr(0, urlRoot.length - 1)) {
//       response.setHeader('Location', urlRoot);
//       response.writeHead(301);
//       response.end('MOVED PERMANENTLY');
//       return true;
//     }

//     if (requestUrl.indexOf(urlRoot) !== 0) {
//       return false;
//     }

//     requestUrl = requestUrl.substring(urlRoot.length - 1);

//     if (requestUrl === '/') {
//       serveStaticFile(staticFolder + '/client.html', response);
//       return true;
//     }

//     // SERVE testacular.js
//     if (requestUrl === '/testacular.js') {
//       serveStaticFile(staticFolder + '/testacular.js', response, function(data, response) {
//         return data.replace('%TESTACULAR_SRC_PREFIX%', urlRoot.substring(1));
//       });
//       return true;
//     }

//     // SERVE context.html - execution context within the iframe
//     // or runner.html - execution context without channel to the server
//     if (requestUrl === '/context.html' || requestUrl === '/debug.html') {
//       serveStaticFile(staticFolder + requestUrl, response, function(data, response) {
//         // never cache
//         setNoCacheHeaders(response);

//         var scriptTags = fileList.getFiles().map(function(file) {
//           var filePath = file.path;

//           if (!file.isUrl) {
//             // TODO(vojta): serve these files from within urlRoot as well
//             if (filePath.indexOf(adapterFolder) === 0) {
//               filePath = '/adapter' + filePath.substr(adapterFolder.length);
//             } else if (filePath.indexOf(baseFolder) === 0) {
//               filePath = '/base' + filePath.substr(baseFolder.length);
//             } else {
//               filePath = '/absolute' + filePath;
//             }

//             if (requestUrl === '/context.html') {
//               filePath += '?' + file.mtime.getTime();
//             }
//           }

//           return util.format(SCRIPT_TAG, filePath);
//         });

//         return data.replace('%SCRIPTS%', scriptTags.join('\n'));
//       });

//       return true;
//     }

//     return false;
//   };
// };

// var findByPath = function(files, path) {
//   for (var i = 0; i < files.length; i++) {
//     if (files[i].path === path) {
//       return files[i];
//     }
//   }

//   return null;
// };


// var createSourceFileHandler = function(fileList, adapterFolder, baseFolder) {
//   return function(request, response) {
//     var requestedFilePath = request.url.replace(/\?.*/, '')
//         .replace(/^\/adapter/, adapterFolder)
//         .replace(/^\/absolute/, '')
//         .replace(/^\/base/, baseFolder);

//     var file = findByPath(fileList.getFiles(), requestedFilePath);

//     if (file) {
//       serveStaticFile(file.contentPath, response, function(data, response) {
//         if (/\?\d+/.test(request.url)) {
//           // files with timestamps - cache one year, rely on timestamps
//           response.setHeader('Cache-Control', ['public', 'max-age=31536000']);
//         } else {
//           // without timestamps - no cache (debug)
//           setNoCacheHeaders(response);
//         }
//       });
//       return true;
//     }
//     return false;
//   };
// };

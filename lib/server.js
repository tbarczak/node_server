/*
  HTTP/S Server related Tasks
 */
const http = require('http')
    , https = require('https')
    , url = require('url')
    , StringDecoder = require('string_decoder').StringDecoder
    , config = require('./config')
    , fs = require('fs')
    , handlers = require('./handlers')
    , helpers = require('./helpers')
    , path = require('path')
    , util = require('util')
    , debug = util.debuglog('server');  //Debug module:  \NODE_DEBUG=server node index.js

//Instantiate Server Module Obj
const server = {};
//@TODO:  Look into this path.join approach to fix some references in my other code!!!!
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpServer = http.createServer(function(req, res) {
  server.unifiedServer(req, res);
});
server.httpsServer = https.createServer(server.httpsServerOptions,function(req, res) {
  server.unifiedServer(req, res);
});


server.unifiedServer = function(req,res) {
  let parsedUrl = url.parse(req.url, true);
  let path = parsedUrl.pathname;  //untrimmed path
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');
  let queryStringObject = parsedUrl.query;
  let method = req.method.toLowerCase();
  let headers = req.headers;
  let decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data',function(data){
    buffer += decoder.write(data);
  });
  req.on('end', function () {
    buffer += decoder.end();

    let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
    let data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    };

    chosenHandler(data,function(statusCode,payload){
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
      payload = typeof(payload) === 'object' ? payload : {};

      let payloadString = JSON.stringify(payload);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green, otherwise print red
      if(statusCode == 200){
        debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      } else {
        debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      }
    });
  });
};

server.router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
};

server.init = () => {
  server.httpServer.listen(config.httpPort, function () {
    console.log('\x1b[36m%s\x1b[0m',`The server is listening on port ${config.httpPort}.`);
  });
  server.httpsServer.listen(config.httpsPort, function () {
    console.log('\x1b[35m%s\x1b[0m',`The server is listening on port ${config.httpsPort}.`);
  });

};

module.exports = server;
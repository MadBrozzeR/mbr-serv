#!/usr/bin/env node

const http = require('http');
const path = require('path');
const Request = require('../src/request.js');

const PARAM_RE = /^--(\w+)=(.+)$/;
const DEFAULT_PORT = 8080;

const params = {};

for (let index = 2 ; index < process.argv.length ; ++index) {
  const argumentMatch = PARAM_RE.exec(process.argv[index]);

  if (argumentMatch) {
    params[argumentMatch[1]] = argumentMatch[2];
  }
}

const serverPath = path.resolve(
  process.argv[1].replace(/\/node_modules\/.+$/, ''),
  process.argv[process.argv.length - 1]
);

let server = null;
const port = params.port || DEFAULT_PORT;

try {
  server = require(serverPath);

  if (!(server instanceof Function)) {
    throw null;
  }
} catch (error) {
  throw new Error('Failed to require server module. Provide module link in last argument. Was trying to require: ' + serverPath);
}

http.createServer(function (request, response) {
  const requester = new Request(request, response);
  server.call(requester, requester);
}).listen(port, function () {
  console.log('Dev Server is running on port ' + port);
});

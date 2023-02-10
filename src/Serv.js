const http = require('http');
const https = require('https');
const utils = require('./utils.js');
const { ERROR, CONST } = require('./constants.js');
const Request = require('./request.js');
const net = require('net');
const { adminListener } = require('./admin.js');
const { Controller } = require('./controller.js');

const templates = utils.templates;

const controller = new Controller({
  root: __dirname + '/..',
  configPath: __dirname + '/../config.json',
});

const port = controller.config.port || 8080;
const securePort = controller.config.security && controller.config.security.port || 8443;
const host = controller.config.host || '0.0.0.0';

function errorListener (error) {
  console.log(ERROR.SERVER_NOT_STARTED, error.stack);
}

function reportServerStart (port, host) {
  console.log(templates.make(templates.serverStarted, {date: Date().toString(), host: host, port: port}));
}

function createServer (isSecure) {
  const proc = mainProc(isSecure);
  const server = isSecure
    ? https.createServer(controller.getSequrityOptions(), proc)
    : http.createServer(proc);
  const serverPort = isSecure ? securePort : port;

  return server
    .on(CONST.UPGRADE, proc)
    .on(CONST.ERROR, errorListener)
    .listen(serverPort, host, function () {
      reportServerStart(serverPort, host);
    });
}

function mainProc (isSecure) {
  return function (request, response) {
    const host = utils.getHost(request);
    const route = controller.getRoute(host, isSecure);

    if (route) {
      try {
        const callback = controller.require(host, isSecure);
        const req = new Request(request, response);
        req.host = host;
        req.module = route;
        callback.call(req, req);
      } catch (error) {
        console.log(Date().toString());
        console.log(templates.make(ERROR.MODULE_ERROR, { host: host, module: route }), error);
      }
    } else {
      console.log(templates.make(ERROR.UNKNOWN_HOST, {host: host}));
      response.writeHead(404);
      response.end();
    }
  }
}

const proc = mainProc(false);
controller.servers.http = createServer(false);
controller.servers.https = createServer(true);

if (controller.config.admin && controller.config.admin.port) {
  net.createServer(adminListener(controller)).listen(controller.config.admin.port);
}

if (
  controller.config.persistent instanceof Array
  && controller.config.persistent.length
) {
  const { persistent } = controller.config;

  for (let index = 0 ; index < persistent.length ; ++index) {
    const path = utils.concatPath(controller.root, persistent[index]);
    if (require.resolve(path)) {
      require(path);
    }
  }
}

process
  .on('uncaughtException', function (error) {
    if (controller.config.preventCrash) {
      console.log('uncaught ecxeption handled:', error);
    } else {
      throw error;
    }
  })
  .on('unhandledRejection', function (error) {
    if (controller.config.preventCrash) {
      console.log('unhandled rejection caught:', error);
    } else {
      // I doubt it's proper way skip rejection handling,
      // but in case of Promise.reject(error) we have
      // an infinite loop in this handler
      throw error;
    }
  });

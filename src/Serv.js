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

function errorListener (error) {
  console.log(ERROR.SERVER_NOT_STARTED, error.stack);
}

function reportServerStart (port, host) {
  console.log(templates.make(templates.serverStarted, {date: Date().toString(), host: host, port: port}));
}

const proc = mainProc(false);
http.createServer(proc)
  .on(CONST.UPGRADE, proc)
  .on(CONST.ERROR, errorListener)
  .listen(port, host, function () {
    reportServerStart(port, host);
  });
if (controller.isSecureEnabled()) {
  const options = controller.getSequrityOptions();
  const proc = mainProc(true);
  https.createServer(options, proc)
    .on(CONST.UPGRADE, proc)
    .on(CONST.ERROR, errorListener)
    .listen(securePort, host, function () {
      reportServerStart(securePort, host);
    });
}

if (controller.config.admin && controller.config.admin.port) {
  net.createServer(adminListener(controller)).listen(controller.config.admin.port);
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

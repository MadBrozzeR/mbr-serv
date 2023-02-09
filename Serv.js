const http = require('http');
const utils = require('./utils.js');
const { ERROR, CONST } = require('./constants.js');
const Request = require('./request.js');
const net = require('net');
const { adminListener } = require('./admin.js');
const { Controller } = require('./controller.js');

const templates = utils.templates;

const controller = new Controller({
  configPath: __dirname + '/config.json',
});

const port = controller.config.port || 8080;
const host = controller.config.host || '0.0.0.0';

function mainProc (request, response) {
  const host = utils.getHost(request);
  const route = controller.config.routes[host] || controller.config.routes.default;
  if (route) {
    try {
      const callback = require(utils.concatPath(__dirname, route));
      const req = new Request(request, response);
      req.host = host;
      req.module = route;
      callback.call(req, req);
    } catch (error) {
      console.log(Date().toString());
      console.log(templates.make(ERROR.NO_ROUTE, {host: host, module: route }), error);
    }
  } else {
    console.log(templates.make(ERROR.UNKNOWN_HOST, {host: host}));
    response.writeHead(404);
    response.end();
  }
}

function errorListener (error) {
  console.log(ERROR.SERVER_NOT_STARTED, error.stack);
}

controller.setTitle();

http.createServer(mainProc)
  .on(CONST.UPGRADE, mainProc)
  .on(CONST.ERROR, errorListener)
  .listen(port, host, function () {
  console.log(templates.make(templates.serverStarted, {date: Date().toString(), host: host, port: port}));
});

if (controller.config.admin && controller.config.admin.port) {
  net.createServer(adminListener(controller)).listen(controller.config.admin.port);
}

const http = require('http');
const fs = require('fs');
const utils = require('./utils.js');
const constants = require('./constants.js');
const Request = require('./request.js');

const ERROR = constants.ERROR;
const CONST = constants.CONST;

const templates = utils.templates;

const defaultConfig = {
  port: 80,
  host: '0.0.0.0',
  title: 'mbr-serv',
  routes: {
    'localhost': './test.js'
  }
};

function getConfig () {
  let config;
  const configPath = __dirname + '/config.json';

  try {
    config = JSON.parse(fs.readFileSync(configPath));
  } catch (e) {
    config = defaultConfig;
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }

  return config;
}

const config = getConfig();

const port = config.port || 8080;
const host = config.host || '0.0.0.0';

function mainProc (request, response) {
  const host = utils.getHost(request);
  const route = config.routes[host] || config.routes.default;
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

config.title && (process.title = config.title);
http.createServer(mainProc)
  .on(CONST.UPGRADE, mainProc)
  .on(CONST.ERROR, errorListener)
  .listen(port, host, function () {
  console.log(templates.make(templates.serverStarted, {date: Date().toString(), host: host, port: port}));
});

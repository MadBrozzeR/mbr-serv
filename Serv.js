const http = require('http');
const fs = require('fs');

const empty = {}

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

/*
// Attempt to implement proxy. Maybe one day...
function getRoutes (routes) {
  let mapper = {};
  for (key in routes) {
    try {
      switch (routes[key].substr(0, 4)) {
        case 'req:':
          mapper[key] = require(routes[key].substr(4));
          break;
        case 'tcp:':
          mapper[key] = function (request) {
            http.
          }
      }
    }
  }
}
*/

const templates = {
  reg: /\$\{(\w+)\}/g,
  document: 
    '<!DOCTYPE ${doctype}>\n' +
    '<html>\n' +
    '<head>\n' +
    '<title>${title}</title>\n' +
    '${metas}' +
    '${scripts}' +
    '</head>\n' +
    '${body}\n' +
    '</html>',
  charsetMeta: '<meta charset="${charset}" />\n',
  meta: '<meta name="${name}" content="${content}" />\n',
  script: '<script src="${script}"></script>\n',
  serverStarted: '${date}\nServer started on ${host}:${port}',
  make: function (template, substitutions) {
    return template.replace(templates.reg, function (_, key) {
      return substitutions[key] || CONST.EMPTY
    });
  }
};

const CONST = {
  AMP: '&',
  COLON: ':',
  COMMA: ',',
  CONTENT_TYPE: 'Content-Type',
  COOKIE: 'cookie',
  DATA: 'data',
  DOT: '.',
  EMPTY: '',
  END: 'end',
  EQUATION: '=',
  ERROR: 'error',
  FAVICON: '/favicon.ico',
  INDEX: 'index.html',
  QUESTION: '?',
  SET_COOKIE: 'Set-Cookie',
  SLASH: '/',
  UPGRADE: 'upgrade'
};

const ERROR = {
  OUT_OF_ROOT: 'Out of root directory',
  SERVER_NOT_STARTED: 'Server cannot be started\n',
  NO_ROUTE: 'Request route not recognized: "${host}": "${module}"\n',
  UNKNOWN_HOST: 'Non-existent host requested: ${host}'
}

const MIME = {
  // application
  js: 'application/javascript',
  json: 'application/json',
  pdf: 'application/pdf',
  xhtml: 'application/xhtml+xml',
  xml: 'application/xml',
  zip: 'application/zip',
  octet: 'application/octet-stream',
  // text
  css: 'text/css',
  htm: 'text/html',
  html: 'text/html',
  plain: 'text/plain',
  txt: 'text/plain',
  // image
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tiff: 'image/tiff'
};

const RE = {
  URL: /^(.*\/)(.+?)?(?:\.(\w+))?(?:\?(.+))?$/,
  COOKIE: /([^=]+)=(.+?)(?:; |$)/g
}

function concatPath (root, path) {
  if (path[0] === CONST.SLASH) {
    return path;
  } else {
    return root + CONST.SLASH + path;
  }
}

function getHost (request) {
  let host = request.headers.host;
  if (host) {
    const colonPos = host.indexOf(CONST.COLON);
    if (host && colonPos > -1) {
      host = host.substr(0, colonPos);
    }
    return host;
  }
}

function parseUrlParams (urlParams) {
  let result = {};
  if (!urlParams) {
    return result;
  }

  let splittedParam;
  let value;
  let key;
  let index;

  const splitted = urlParams.split(CONST.AMP);
  for (index = 0 ; index < splitted.length ; index++) {
    splittedParam = splitted[index].split(CONST.EQUATION);
    key = splittedParam[0];
    value = decodeURIComponent(splittedParam[1]);

    if (result[key]) {
      if (result[key].push) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

function Request (request, response) {
  this.request = request;
  this.response = response;
  this.ip = request.socket.remoteAddress;
  this.port = request.socket.remotePort;
  this.headers = {};
  this.status = 200;
  this.root = CONST.EMPTY;
  this.host = null;
  this.module = null;
}

Request.prototype.valueOf = Request.prototype.toJSON = function () {
    return {
        request: {
            url: this.request.url,
            method: this.request.url,
            httpVersion: this.request.httpVersion,
            headers: this.request.headers,
            statusCode: this.request.statusCode,
            statusMessage: this.request.statusMessage,
            trailers: this.request.trailers,
            upgrade: this.request.upgrade
        },
        ip: this.ip,
        port: this.port,
        headers: this.headers,
        status: this.status,
        root: this.root,
        host: this.host,
        module: this.module
    }
}

Request.prototype.getData = function (callback) {
  let cache = [];
  let length = 0;
  const _this = this;
  this.request.on(CONST.DATA, function (data) {cache.push(data); length += data.length;});
  this.request.on(CONST.END, function () {callback && callback.call(_this, Buffer.concat(cache, length));});
}

Request.prototype.getUrlParams = function () {
  if (!this.urlParams) {
    const urlMatches = RE.URL.exec(this.request.url);
    const dir = urlMatches[1];
    const ext = urlMatches[3];
    const file = (urlMatches[2] || CONST.EMPTY) + (ext ? (CONST.DOT + ext) : CONST.EMPTY);

    this.urlParams = {
      directory: dir,
      file: file,
      extension: ext,
      params: parseUrlParams(urlMatches[4])
    };
  }
  return this.urlParams;
}

Request.prototype.getPath = function () {
  if (!this.path) {
    const splitted = this.request.url.split(CONST.QUESTION);
    this.path = splitted[0];
    this.params = splitted[1];
  }
  return this.path;
}

Request.prototype.getParams = function () {
  if (!this.params) {
    this.getPath();
  } else if (!(this.params instanceof Object)) {
    this.params = parseUrlParams(this.params);
  }
  return this.params;
}

function getPathData (path) {
    const slashPos = path.lastIndexOf(CONST.SLASH) + 1;
    const directory = path.substring(0, slashPos);
    const file = path.substring(slashPos);
    const dotPos = file.lastIndexOf(CONST.DOT);
    const extension = (dotPos < 0) ? null : file.substring(dotPos + 1);

    return {
        directory: directory,
        file: file,
        extension: extension
    };
}

function getFile (root, filePath, extension, callback, request) {
  const path = root + filePath;

  fs.realpath(path, function (error, realPath) {
    if (error) {
      callback.call(request, null, error);
    } else if (!root || realPath.substr(0, root.length) === root) {
      fs.readFile(realPath, function (error, data) {
        if (error) {
          callback.call(request, null, error);
        } else {
          callback.call(request, MIME[extension] || MIME.octet, data);
        }
      });
    } else {
      callback.call(request, null, new Error(ERROR.OUT_OF_ROOT));
    }
  });
}

Request.prototype.readFile = function (callback) {
  const url = this.getUrlParams();
  const root = this.root;
  const path = root + url.directory + url.file;

  getFile(root, url.directory + url.file, url.extension, callback, this);
};

Request.prototype.template = function (props) {
  props || (props = empty);
  let params = {
    doctype: props.doctype || 'html',
    title: props.title || CONST.EMPTY,
    metas: templates.make(templates.charsetMeta, {charset: props.charset || 'utf-8'}),
    scripts: CONST.EMPTY,
    body: props.body || '<body></body>\n'
  };
  if (props.viewport) {
    let VPParams = CONST.EMPTY;
    props.viewport.width && (VPParams += 'width=' + props.viewport.width);
    props.viewport.initialScale && (
      VPParams += (VPParams ? CONST.COMMA : CONST.EMPTY) + 'initial-scale=' + props.viewport.initialScale
    );
    props.viewport.minimumScale && (
      VPParams += (VPParams ? CONST.COMMA : CONST.EMPTY) + 'minimum-scale=' + props.viewport.minimumScale
    );
    props.viewport.maximumScale && (
      VPParams += (VPParams ? CONST.COMMA : CONST.EMPTY) + 'maximum-scale=' + props.viewport.maximumScale
    );
    (props.viewport.scalable !== undefined) && (
      VPParams += (VPParams ? CONST.COMMA : CONST.EMPTY) + 'user-scalable=' + (props.viewport.scalable ? 'yes' : 'no')
    );
    params.metas += templates.make(templates.meta, {name: 'viewport', content: VPParams});
  }
  for (let index in props.scripts) {
    params.scripts += templates.make(templates.script, {script: props.scripts[index]});
  }
  
  return templates.make(templates.document, params);
}

Request.prototype.getCookies = function () {
  if (!this.cookies) {
    this.cookies = {};

    if (this.request.headers[CONST.COOKIE]) {
      let regMatch;
      while (regMatch = RE.COOKIE.exec(this.request.headers[CONST.COOKIE])) {
        this.cookies[regMatch[1]] = decodeURIComponent(regMatch[2]);
      }
    };
  }
  
  return this.cookies;
}

Request.prototype.match = function (regExp, callback) {
  const regMatch = regExp.exec(this.getPath());
  if (regMatch && callback) {
    callback.call(this, regMatch);
  }
  return regMatch;
}

Request.prototype.getCookie = function (name) {
  return this.getCookies()[name];
}

Request.prototype.setCookie = function (name, value, options) {
  if (!this.headers[CONST.SET_COOKIE]) {
    this.headers[CONST.SET_COOKIE] = [];
  }
  options || (options = empty);
  let newCookie = name + CONST.EQUATION + encodeURIComponent(value);
  (options.expires instanceof Date) && (newCookie += '; Expires=' + options.expires.toUTCString());
  (options.maxAge !== undefined) && (newCookie += '; Max-Age=' + options.maxAge);
  options.domain && (newCookie += '; Domain=' + options.domain);
  options.path && (newCookie += '; Path="' + options.path + '"');
  options.secure && (newCookie += '; Secure');
  options.httpOnly && (newCookie += '; HttpOnly');

  this.headers[CONST.SET_COOKIE].push(newCookie);
}
Request.prototype.delCookie = function (name) {
  const expires = new Date();
  expires.setDate(-1);
  this.setCookie(name, CONST.EMPTY, {expires: expires});
}

Request.prototype.send = function (data, ext) {
  if (ext) {
    this.headers[CONST.CONTENT_TYPE] = MIME[ext] || MIME.octet;
  }
  this.response.writeHead(this.status, this.headers);
  this.response.end(data || CONST.EMPTY);
};

Request.prototype.route = function (router) {
  const route = router[this.getPath()] || router.default;
  return route && route.call(this, this);
}

function returnFileData (mime, data) {
    if (!mime) {
        if (this.path !== CONST.FAVICON) {
            this.status = 404;
            this.send(CONST.EMPTY, 'html');
            console.log(data);
        } else {
            this.status = 200;
            this.send();
        }
    } else {
        this.status = 200;
        this.headers[CONST.CONTENT_TYPE] = mime;
        this.send(data);
    }
}

Request.prototype.simpleServer = function (options) {
    if (!options) {
        return;
    }

    const root = options.root;
    const index = options.index || CONST.INDEX;
    this.getPath();
    const path = this.path === CONST.SLASH ? index : this.path;
    if (options.prepare) {
      options.prepare.call(this);
    }
    if (!(options.router && this.route(options.router))) {
      const extension = getPathData(path).extension;
      getFile(root, path, extension, returnFileData, this);
    }
}

function mainProc (request, response) {
  const host = getHost(request);
  const route = config.routes[host] || config.routes.default;
  if (route) {
    try {
      const callback = require(concatPath(__dirname, route));
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

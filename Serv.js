const http = require('http');
const fs = require('fs');
const config = require('./config_default.js');

const port = config.port || 8080;
const host = config.host || '0.0.0.0';

const empty = {}

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
  QUESTION: '?',
  SET_COOKIE: 'Set-Cookie',
  SLASH: '/',
  UPGRADE: 'upgrade'
};

const ERROR = {
  OUT_OF_ROOT: 'Out of root directory'
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

function getHost (request) {
  const host = request.headers.host;
  return host.substr(0, host.indexOf(CONST.COLON));
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
  this.headers = {};
  this.status = 200;
  this.root = CONST.EMPTY;
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

Request.prototype.match = function (regExp) {
  return regExp.exec(this.request.url);
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

function mainProc (request, response) {
  const callback = config.routes[getHost(request)] || config.routes.default;
  try {
    callback && callback(new Request(request, response));
  } catch (e) {
    console.log(Date().toString());
    console.log(e);
  }
}

http.createServer(mainProc).on(CONST.UPGRADE, mainProc).listen(port, host, function () {
  console.log(templates.make(templates.serverStarted, {date: Date().toString(), host: host, port: port}));
});

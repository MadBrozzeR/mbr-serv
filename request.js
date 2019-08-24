const constants = require('./constants.js');
const utils = require('./utils.js');

const CONST = constants.CONST;
const RE = constants.RE;
const MIME = constants.MIME;
const templates = utils.templates;

const empty = {};

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
};

Request.prototype.getData = function (callback) {
  let cache = [];
  let length = 0;
  const _this = this;
  this.request.on(CONST.DATA, function (data) {cache.push(data); length += data.length;});
  this.request.on(CONST.END, function () {callback && callback.call(_this, Buffer.concat(cache, length));});
};

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
      params: utils.parseUrlParams(urlMatches[4])
    };
  }
  return this.urlParams;
};

Request.prototype.getPath = function () {
  if (!this.path) {
    const splitted = this.request.url.split(CONST.QUESTION);
    this.path = splitted[0];
    this.params = splitted[1];
  }
  return this.path;
};

Request.prototype.getParams = function () {
  if (!this.params) {
    this.getPath();
  } else if (!(this.params instanceof Object)) {
    this.params = utils.parseUrlParams(this.params);
  }
  return this.params;
};

Request.prototype.readFile = function (callback) {
  const url = this.getUrlParams();
  const root = this.root;
  const path = root + url.directory + url.file;

  utils.getFile(root, url.directory + url.file, url.extension, callback, this);
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
};

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
};

Request.prototype.match = function (regExp, callback) {
  const regMatch = regExp.exec(this.getPath());
  if (regMatch && callback) {
    callback.call(this, regMatch);
  }
  return regMatch;
};

Request.prototype.getCookie = function (name) {
  return this.getCookies()[name];
};

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
};

Request.prototype.delCookie = function (name) {
  const expires = new Date();
  expires.setDate(-1);
  this.setCookie(name, CONST.EMPTY, {expires: expires});
}

Request.prototype.send = function (data = '', ext) {
  if (ext) {
    this.headers[CONST.CONTENT_TYPE] = MIME[ext] || MIME.octet;
  }
  this.headers[CONST.CONTENT_LENGTH] = Buffer.byteLength(data);
  this.response.writeHead(this.status, this.headers);
  this.response.end(data || CONST.EMPTY);
};

Request.prototype.route = function (router) {
  const route = router[this.getPath()] || router.default;

  if (route instanceof Function) {
    route.call(this, this);
  } else if (typeof route === CONST.STRING) {
    utils.sendFile.call(this, route);
  } else {
    if (route[this.request.method] instanceof Function) {
      route[this.request.method].call(this, this);
    } else {
      this.status = 405;
      this.headers.Allow = Object.keys(route).join(', ');
      this.send();
    }
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
    const extension = utils.getPathData(path).extension;
    utils.getFile(root, path, extension, returnFileData, this);
}

Request.prototype.proxy = function (options = empty) {
  const origin = this;
  const options = {
    hostname: options.hostname || 'localhost',
    port: options.port || 80,
    path: options.path || origin.request.url,
    method: options.method || origin.request.method,
    headers: options.headers || origin.request.headers
  };
  origin.request.pipe(
    http.request(options, function (response) {
      origin.response.writeHead(response.statusCode, response.headers);
      response.pipe(origin.response, {end: true});
    }), {end: true}
  );
}

module.exports = Request;

'use strict';

const http = require('http');
const fs = require('fs');

const RE = {
  url: /^\/([^?#]*)(?:\?(.*))?$/
};

function sendAnswer(data) {
  for (const header in this.head) {
    switch (header) {
      case 'CT':
        this.response.setHeader('Content-Type', this.head.CT);
        break;
      case 'length':
        this.response.setHeader('Content-Length',
          this.head.length === true ? Buffer.byteLength(data) : this.head.length
        );
        break;
      case 'code':
        break;
      case 'cookie':
        let cookies = [];
        this.head.cookie.forEach(function(cookieGroup) {
          let set = [];
          for (key in cookieGroup.set) set.push(key + '=' + escape(cookieGroup.set[key]));
          if (set.length) {
            if (cookieGroup.expires) set.push(cookieGroup.expires.toUTCString());
            cookies.push(set.join('; '));
          }
        });
        cookies.length && this.response.setHeader('Set-Cookie', cookies);
        break;
      default:
        this.response.setHeader(header, this.head[header]);
        break;
    }
  }
  this.response.statusCode = this.head.code;
  this.response.end(data, this.encoding);
}

function getCookies() {
	return this.request.headers.cookie && uriSplit(this.request.headers.cookie.split(';'));
}

function setCookies(cookies, expires) {
  this.head.cookie.push({set: cookies, expires: expires});
}

// function setCookie(name, value, expires) {
//   this.setCookies({[name]: value}, expires);
// }

function Request(request, response, options) {
  const get = parseGet(request.url);

  this.data = '';
  this.request = request;
  this.response = response;
  this.path = get.path;
  this.params = get.params;
  this.head = {code: 200, cookie: []};
  this.encoding = options.encoding || 'utf8';
  this.onData = null;

  request.on('data', (data) => {this.data += data});
  request.on('end', () => {
    this.onData && this.onData(this.data.toString(this.encoding));
  });
}

Request.prototype = {
  getCookies: getCookies,
  setCookies: setCookies,
  send: sendAnswer
}

function uriSplit(array) {
  let obj = {};
  array && array.forEach(function(uri){
    const pos = uri.indexOf('=');
    const key = uri.substr(0, pos);
    const value = decodeURI(uri.substr(pos + 1));
    if (obj[key]) obj[key].push(value);
    else obj[key] = [value];
  });
  return obj;
}

function parseGet(url){
	const mat=url.match(RE.url);
	return {
		all: url,
		path: mat[1],
		params: mat[2] ? uriSplit(mat[2].split('&')) : {}
	};
}

function fileAction() {}

fileAction.prototype = {
  and: function(callback) {this.success = callback; return this;},
  or: function(callback) {this.fail = callback; return this;}
};

function readFile(path, enc) {
  let actions = new fileAction();
  fs.exists(path, function(flag) {
    if (flag) fs.readFile(path, enc, function(err, data) {
      if (err) actions.fail && actions.fail(err);
      actions.success && actions.success(data);
    });
    else actions.fail && actions.fail(404);
  });
  return actions;
}

function getExtension(file) {
  const pos = file.lastIndexOf('.') + 1;
  if (pos) return file.substr(pos);
  else return false;
}

const typeLibrary = {
  htm: {mime: 'text/html'},
  html: {mime: 'text/html'},
  css: {mime: 'text/css'},
  js: {mime: 'text/javascript'},
  ico: {mime: 'image/x-icon'},
  png: {mime: 'image/png'},
  gif: {mime: 'image/gif'},
  jpg: {mime: 'image/jpeg'},
  jpeg: {mime: 'image/jpeg'},
  svg: {mime: 'image/svg+xml'},
  tif: {mime: 'image/tiff'},
  tiff: {mime: 'image/tiff'}
}

const defaultTypeAction = {
  success: function(req, data) {req.send(data)},
  failure: function(req, error) {req.head.code = 404; req.send();}
}

function onRequest(options) {
  return function(request, response) {
    const req = new Request(request, response, options);
    if (options.script && options.script(req)) return true;
    (!req.path && options.defaultPage) && (req.path = options.defaultPage);
    const ext = getExtension(req.path);
    const fileType = options.typeLibrary && options.typeLibrary[ext] || typeLibrary[ext];
    if (fileType) {
      req.head.CT = fileType.mime;
      readFile(req.path, req.encoding)
        .and(function(data) {fileType.success ? fileType.success(req, data) : defaultTypeAction.success(req, data);})
        .or(function(error) {fileType.failure ? fileType.failure(req, error) : defaultTypeAction.failure(req, error);});
    } else {
      req.head.code = 400;
      req.send();
    }
  }
}

module.exports = function Server(options) {
  options || (options = {});
  this.host = options.host || '0.0.0.0';
  this.port = options.port || 8080;
  this.server = http.createServer(onRequest(options));

  this.server.listen(this.port, this.host, options.onStart);
};

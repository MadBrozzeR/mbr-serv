const fs = require('fs');
const path = require('path');
const { CONST, MIME, ERROR } = require('./constants.js');

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

module.exports.templates = templates;

module.exports.concatPath = function concatPath (root, path) {
  if (path[0] === CONST.SLASH) {
    return path;
  } else {
    return root + CONST.SLASH + path;
  }
};

module.exports.getHost = function getHost (request) {
  let host = request.headers.host;
  if (host) {
    const colonPos = host.indexOf(CONST.COLON);
    if (host && colonPos > -1) {
      host = host.substr(0, colonPos);
    }
    return host;
  } else {
    // TODO Remove case when undefined host mistery has been revieled. 
    console.log('host is undefined. Request headers:', JSON.stringify(request.headers, null, 2));
  }
};

module.exports.parseUrlParams = function parseUrlParams (urlParams) {
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

module.exports.getPathData = function getPathData (path) {
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
};

function getFileUnsafe (file, callback) {
  const request = this;
  fs.readFile(file, function (error, data) {
    callback && callback.call(request, error, data);
  });
};

module.exports.sendFile = function (file) {
  const request = this;

  getFileUnsafe.call(request, file, function (error, data) {
    if (error) {
      request.status = 404;
      request.send();
    } else {
      const url = request.getUrlParams();
      request.send(data, url.extension);
    }
  });
}

module.exports.getFile = function getFile (root, filePath, extension, callback, request) {
  if (filePath[0] === '/') {
    filePath = filePath.substring(1);
  }
  const realRoot = path.resolve(root) + '/';
  const realPath = path.resolve(realRoot, filePath);

  if (!root || realPath.substr(0, realRoot.length) === realRoot) {
    fs.readFile(realPath, function (error, data) {
      if (error) {
        callback.call(request, null, error);
      } else {
        callback.call(request, MIME[extension] || MIME.octet, data);
      }
    });
  } else {
    callback.call(request, null, new Error(templates.make(ERROR.OUT_OF_ROOT, { path: filePath, root: realRoot })));
  }
};

module.exports.returnFileData = function returnFileData (mime, data) {
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
};

function uncache(moduleName, recoursive, callback) {
  const resolved = require.resolve(moduleName);
  const cache = require.cache[resolved];

  if (!cache) {
    return;
  }

  if (recoursive) {
    for (let index = 0 ; index < cache.children.length ; ++index) {
      uncache(cache.children[index].id, recoursive, callback);
    }
  }

  callback && callback(resolved);
  delete require.cache[resolved];
}

module.exports.uncache = uncache;

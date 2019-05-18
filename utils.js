const fs = require('fs');
const CONST = require('./constants.js').CONST;

templates = {
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
    console.log('host is undefined. Request:', JSON.stringify(request, null, 2));
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

module.exports.getFile = function getFile (root, filePath, extension, callback, request) {
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

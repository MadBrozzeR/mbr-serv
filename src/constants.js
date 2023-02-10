module.exports = {
  CONST: {
    AMP: '&',
    COLON: ':',
    COMMA: ',',
    CONTENT_TYPE: 'Content-Type',
    CONTENT_LENGTH: 'Content-Length',
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
    STRING: 'string',
    SLASH: '/',
    UPGRADE: 'upgrade'
  },

  ERROR: {
    OUT_OF_ROOT: 'Out of root directory',
    SERVER_NOT_STARTED: 'Server cannot be started\n',
    MODULE_ERROR: 'Error in module: "${host}": "${module}"\n',
    UNKNOWN_HOST: 'Non-existent host requested: ${host}'
  },

  MIME: {
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
    txt: 'text/plain',
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
  },

  RE: {
    URL: /^(.*\/)(.+?)?(?:\.(\w+))?(?:\?(.+))?$/,
    COOKIE: /([^=]+)=(.+?)(?:; |$)/g
  }
};

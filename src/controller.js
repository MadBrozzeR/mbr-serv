const fs = require('fs');
const utils = require('./utils.js');

const DEFAULT_CONFIG = {
  port: 80,
  host: '0.0.0.0',
  title: 'mbr-serv',
  preventCrash: false,
  routes: {
    'localhost': './test.js'
  },
  admin: {
    port: 8090
  },
  security: {
    key: '',
    cert: '',
    port: 443,
    routes: {
      'localhost': './test.js'
    }
  }
};

function Controller({ configPath, root } = {}) {
  this.root = root || __dirname;
  this.config = DEFAULT_CONFIG;
  this.configPath = configPath;

  if (configPath) {
    this.loadConfig();
  }
}

Controller.prototype.loadConfig = function (configPath) {
  const path = configPath || this.configPath;
  try {
    this.config = JSON.parse(fs.readFileSync(path));
  } catch (e) {
    this.config = DEFAULT_CONFIG;
    fs.writeFileSync(path, JSON.stringify(this.config, null, 2));
  }

  this.setTitle();

  return this.config;
}

Controller.prototype.setTitle = function (title) {
  const newTitle = title || this.config.title;

  if (newTitle && newTitle !== process.title) {
    process.title = newTitle;
  }
}

Controller.prototype.getRoute = function (host, isSecure = false) {
  return isSecure
    ? this.config.security.routes[host] || this.config.security.routes.default
    : this.config.routes[host] || this.config.routes.default;
}

Controller.prototype.require = function (host, isSecure) {
  const route = this.getRoute(host, isSecure);

  return require(utils.concatPath(this.root, route));
}

Controller.prototype.uncacheRoute = function (host, isSecure) {
  const route = this.getRoute(host, isSecure);

  delete require.cache[require.resolve(route)];
}

Controller.prototype.isSecureEnabled = function () {
  return !!(this.config.security && this.config.security.key && this.config.security.cert);
}

Controller.prototype.getSequrityOptions = function () {
  if (this.isSecureEnabled()) {
    try {
      return {
        key: fs.readFileSync(utils.concatPath(this.root, this.config.security.key)),
        cert: fs.readFileSync(utils.concatPath(this.root, this.config.security.cert)),
      };
    } catch (error) {
      console.log(error);
    }
  }

  return null;
}

module.exports = { Controller };
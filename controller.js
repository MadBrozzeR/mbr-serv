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
  admin: null
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
    if (error instanceof SyntaxError) {
      // JSON parsing error
      console.log('Config is broken! No changes applied.');
    } else {
      // File not found
      this.config = DEFAULT_CONFIG;
      fs.writeFileSync(path, JSON.stringify(this.config, null, 2));
    }
  }

  return this.config;
}

Controller.prototype.setTitle = function (title) {
  const newTitle = title || this.config.title;

  if (newTitle) {
    process.title = newTitle;
  }
}

Controller.prototype.getRoute = function (host) {
  return this.config.routes[host] || this.config.routes.default;
}

Controller.prototype.require = function (host) {
  const route = this.getRoute(host);

  return require(utils.concatPath(this.root, route));
}

Controller.prototype.uncacheRoute = function (host) {
  const route = this.getRoute(host);

  delete require.cache[require.resolve(route)];
}

module.exports = { Controller };

const fs = require('fs');

const DEFAULT_CONFIG = {
  port: 80,
  host: '0.0.0.0',
  title: 'mbr-serv',
  routes: {
    'localhost': './test.js'
  },
  admin: null
};

function Controller({ configPath } = {}) {
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

  return this.config;
}

Controller.prototype.setTitle = function (title) {
  const newTitle = title || this.config.title;

  if (newTitle) {
    process.title = newTitle;
  }
}

module.exports = { Controller };

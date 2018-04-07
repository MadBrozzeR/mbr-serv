// Config example.
const defaultConfig = {
  host: '0.0.0.0',
  port: 9001,

  routes: {
    // 'domain': function (RequestObj) {}
  }
};

try {
  module.exports = require('./config.js');
} catch (e) {
  console.log(e);
  module.exports = defaultConfig;
}

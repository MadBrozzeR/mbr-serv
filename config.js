const mailServer = require('../mail/server.js');
//const mcDatapacks = require('../mc/datapacks/server.js');
const mcViewer = require('../mc/viewer/server.js');

module.exports = {
  host: '0.0.0.0',
  port: 9001,

  routes: {
    '127.0.0.1': mailServer,
    'localhost': mcViewer
  }
}

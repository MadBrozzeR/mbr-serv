const Server = require('./serv.js');

const port = 9002;
const host = '0.0.0.0';

const serv = new Server({
  port: port,
  host: host,
  onStart: function() {console.log('Server started at ' + host + ':' + port);},
  defaultPage: 'index.html'
});

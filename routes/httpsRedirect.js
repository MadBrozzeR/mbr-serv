module.exports = function (request) {
  if (request.request.method !== 'GET') {
    request.status = 400;
    request.send();
  }

  const path = 'https://' + request.getHost() + request.request.url;

  request.redirect(path, 301);
};

module.exports = function () {
  const content = this.template({
    title: 'This is a test page!',
    body: '<body><h1>Test page</h1><div>The purpose of this page is to test if your server is working.</div></body>'
  });
  this.send(content, 'html');
}

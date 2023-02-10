function getCommand (data) {
  const text = data.toString().trim();
  const spacePosition = text.indexOf(' ');

  return spacePosition > -1 ? {
    command: text.substring(0, spacePosition),
    parameters: text.substring(spacePosition + 1),
  } : {
    command: text,
    parameters: null,
  };
}

const HELP = {
  list: ['List all routes as "[host]: [route]"'],
  reconfig: ['Reload server config'],
  quit: ['Close admin session'],
  reroute: ['Reload route file by host (clear cache)', 'Usage:', 'reroute [host]'],
  null: ['Command list:', 'help, list, reconfig, quit, reroute'],
};

const TEXT = {
  HELLO: 'What do you need, My Master?\n',
  BYE: 'It\'s being pleasure to serve you, My Master!\n',
  DONE: 'Your wish is fulfilled!\n',
  NO_ROUTE_FOUND: 'I don\'t know this hostname.\n',
}

const Admin = {
  help: function (_controller, parameters, socket) {
    const variant = HELP[parameters];

    if (variant) {
      socket.write(variant.join('\n') + '\n');
    }
  },
  quit: function (_controller, _parameters, socket) {
    socket.end(TEXT.BYE);
  },
  list: function (controller, _parameters, socket) {
    const { routes } = controller.config;

    for (const route in routes) {
      socket.write(route + ': ' + routes[route] + '\n');
    }
  },
  reconfig: function (controller, _parameters, socket) {
    controller.loadConfig();
    socket.write(TEXT.DONE);
  },
  reroute: function (controller, parameters, socket) {
    if (parameters in controller.config.routes) {
      controller.uncacheRoute(parameters);
      socket.write(TEXT.DONE);
    } else {
      socket.write(TEXT.NO_ROUTE_FOUND);
    }
  }
}

module.exports.adminListener = function adminListener(controller) {
  return function (socket) {
    socket.write(TEXT.HELLO);

    socket.on('data', function (data) {
      const input = getCommand(data);

      if (input.command in Admin) {
        Admin[input.command](controller, input.parameters, socket);
      }
    });
  }
}

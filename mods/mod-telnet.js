import globalBus from "bus";
import Telnet from "telnet";
import CLI from "cli";

CLI.install(function (command, params) {
  switch (command) {
    case "pub":
      if (params.length == 1) this.line(`publising ${params[0]}`);
      globalBus.emit(params[0]);
      break;
    case "help":
      this.line(`example [params] - display number of parameters`);
      this.line(`pub topic - display number of parameters`);
      break;
    default:
      return false;
  }
  return true;
});

export default function ({ name, bus, port = 2300 } = {}) {
  let server = null;

  function start() {
    if (server) {
      trace(`${name} already started\n`);
      return;
    }
    server = new Telnet({ port });
    bus.emit("started");
    trace(`${name} ready on port ${port}\n`);
  }

  function stop() {
    trace(`${name} stopping\n`);
    server.close();
    server = null;
    bus.emit("stopped");
  }

  return Object.freeze({
    start,
    stop,
    depends: ["network"],
  });
}

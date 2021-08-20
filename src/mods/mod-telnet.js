import globalBus from "bus";
import Telnet from "telnet";
import CLI from "cli";

CLI.install(function (command, params) {
  // let cli = this;
  // function printSub(...args) {
  //   cli.line(`\nSUB: ${JSON.stringify(args)}`);
  // }
  switch (command) {
    case "pub":
      if (params.length == 1) this.line(`publising ${params[0]}`);
      globalBus.emit(params[0], params[1]);
      return true;
    case "sub":
      if (this.cb == null) {
        this.cb = (...args) => {
          this.line(`\nSUB: ${JSON.stringify(args)}`);
        };
        globalBus.on("*", this.cb);
      } else {
        this.line("Already subscribed");
      }
      return true;

    case "unsub":
      if (this.cb) {
        globalBus.off("*", this.cb);
        this.cb = null;
      }
      return true;
    case "help":
      this.line(`pub topic - publish to topic`);
      this.line(`sub topic - subscribe to topic`);
      this.line(`unsub topic - unsubscribe from topic`);
      break;
    default:
      return false;
  }
  return true;
});

export default function ({ name = "telnet", bus, port = 2300 } = {}) {
  let server = null;

  function start() {
    if (server) {
      trace(`${name} already started\n`);
      return;
    }
    server = new Telnet({ port });
    bus.emit("started", { port });
    trace(`${name} ready on port ${port}\n`);
  }

  function stop() {
    trace(`${name} stopping\n`);
    if (server) {
      server.close();
      server = null;
      bus.emit("stopped");
    }
  }

  return Object.freeze({
    start,
    stop,
  });
}

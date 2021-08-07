import Telnet from "telnet";
import CLI from "cli";

import bus from "bus";

CLI.install(function (command, params) {
  switch (command) {
    case "example":
      this.line(`example with ${params.length} parameters`);
      break;
    case "pub":
      if (params.length == 1) this.line(`publising ${params[0]}`);
      bus.emit(params[0]);
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

export default function () {
  new Telnet({ port: 2300 });
  trace("telnet ready on port 2300\n");
}

import fctry from "fctry";
import Preference from "preference";

import CLI from "cli";

CLI.install(function (command, opts) {
  switch (command) {
    case "fctry":
      const subcommand = opts.shift();
      switch (subcommand) {
        case "ls":
          if (opts.length == 1) {
            this.line(fctry.keys(...opts).join(" "));
          }
          break;
        case "get":
          if (opts.length == 2) {
            this.line(String.fromArrayBuffer(fctry.get(...opts)));
          }
          break;
        case "reset":
          fctry.reset();
          break;
        default:
          this.line(`invalid subcommand "${subcommand}"`);
      }
      break;
    case "help":
      this.line(`fctry ls namespace - list names in namespace`);
      this.line(`fctry get namespace name - read param`);
      this.line(`fctry reset- erase nvs partition`);
      break;
    default:
      return false;
  }
  return true;
});

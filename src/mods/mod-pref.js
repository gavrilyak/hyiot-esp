import pref from "preference";

import CLI from "cli";

CLI.install(function (command, opts) {
  switch (command) {
    case "pref":
      {
        const subcommand = opts.shift();
        switch (subcommand) {
          case "ls":
            if (opts.length == 1) {
              this.line(pref.keys(...opts).join(" "));
            }
            break;
          case "get":
            if (opts.length == 2) {
              let val = pref.get(...opts);
              let type = typeof val;
              this.line(`Type is ${type}`);
              switch (type) {
                case "boolean":
                case "number":
                case "string":
                case "object": //buffer
                  this.line(val);
                  break;
                case "undefined":
                  //nothing
                  break;

                default:
                  this.line(`Unsupported type ${type}`);
              }
            }
            break;
          case "set":
            if (opts.length == 3) {
              pref.set(...opts);
            }
            break;
          case "rm":
            if (opts.length == 2) {
              pref.delete(...opts);
            }
            break;

          default:
            this.line(`invalid subcommand "${subcommand}"`);
            break;
        }
      }
      break;
    case "help":
      this.line(`pref ls namespace - list names in namespace`);
      this.line(`pref get namespace name - read param`);
      this.line(`pref set namespace name value - write param`);
      this.line(`pref rm namespace name - delete param`);
      break;
    default:
      return false;
  }
  return true;
});

/*
pref.set(
  "mods",
  "wifista",
  JSON.stringify({ ssid: "home", password: "Ochen'DlinniyParol'" })
);
*/

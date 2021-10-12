import pref from "preference";

import CLI from "cli";

CLI.install(function (command, opts) {
  switch (command) {
    case "pref":
      {
        const [subcommand, ns, key, val] = opts;
        switch (subcommand) {
          case "ls":
            if (opts.length == 2) {
              this.line(pref.keys(ns).join(" "));
            }
            break;
          case "get":
            if (!key) {
              let res = {};
              for (const k of pref.keys(ns)) res[k] = pref.get(ns, k);
              this.line(JSON.stringify(res, null, 2));
            } else {
              let val = pref.get(ns, key);
              let type = typeof val;
              this.line(`Type is ${type}`);
              switch (type) {
                case "boolean":
                case "number":
                case "string":
                case "object": //buffer
                  this.line(String(val));
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
            if (opts.length == 4) {
              pref.set(ns, key, val);
            }
            break;
          case "rm":
            if (opts.length == 3) {
              pref.delete(ns, key);
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

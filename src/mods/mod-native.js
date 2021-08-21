import { tzset, getenv, setenv, localtime } from "esp32";

import CLI from "cli";

CLI.install(function (command, opts) {
  switch (command) {
    case "getenv":
      this.line(getenv(...opts));
      break;
    case "setenv":
      setenv(...opts);
      break;
    case "tzset":
      tzset();
      break;
    case "localtime":
      this.line(localtime());
      break;
    case "help":
      this.line(`getenv name - getenvnames in namespace`);
      this.line(`setenv name value`);
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

import { setenv, tzset } from "native/all";
import Resource from "Resource";
import * as ini from "inifile";

function findTZ(bin, name) {
  const [cont, ...city] = name.split("/");
  return ini.get(bin, cont, city.join("/"));
}

export default function ({ bus, tz }) {
  function start() {
    if (!tz) {
      bus.emit("error", "Empty timezone");
      return;
    }
    let posix = findTZ(new Resource("zones.ini"), tz);
    if (!posix) {
      bus.emit("error", "Unsupported timezone");
      return;
    }
    setenv("TZ", posix, 1);
    tzset();
    let d = new Date();
    let now = d.toString();
    let utc = d.toUTCString();
    bus.emit("started", { tz, posix, utc, now });
  }

  function stop() {
    bus.emit("stopped");
  }

  return {
    start,
    stop,
  };
}

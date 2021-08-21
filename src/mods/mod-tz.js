import { setenv, tzset } from "esp32";
export default function ({ bus, posix }) {
  function start() {
    if (!posix) {
      bus.emit("error", "Empty timezone");
      return;
    }
    setenv("TZ", posix, 1);
    tzset();
    let d = new Date();
    let now = d.toString();
    let utc = d.toUTCString();
    bus.emit("started", { posix, utc, now });
  }

  function stop() {
    bus.emit("stopped");
  }

  return {
    start,
    stop,
  };
}

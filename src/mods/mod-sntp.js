import SNTP from "sntp";
import Time from "time";

const hosts = [
  "0.pool.ntp.org",
  "1.pool.ntp.org",
  "2.pool.ntp.org",
  "3.pool.ntp.org",
];

export default function ({ bus }) {
  let smtp;
  function start() {
    smtp = new SNTP({ host: hosts.shift() }, function (message, ts) {
      switch (message) {
        case SNTP.time:
          if (ts != null) {
            Time.set(ts);
            bus.emit("started", { ts });
          }
          break;

        case SNTP.retry:
          trace("Retrying.\n");
          break;

        case SNTP.error:
          if (hosts.length) {
            return hosts.shift();
          } else {
            bus.emit("error");
          }

          break;
      }
    });
  }

  function stop() {
    smtp?.close();
    bus.emit("stopped");
  }

  return {
    start,
    stop,
  };
}

import SNTP from "sntp";
import Time from "time";

const globalHosts = [
  "0.pool.ntp.org",
  "1.pool.ntp.org",
  // "2.pool.ntp.org",
  // "3.pool.ntp.org",
];

export default function ({ bus }) {
  let sntp;
  function start() {
    let hosts = [...globalHosts];
    sntp = new SNTP({ host: hosts.shift() }, function (message, ts) {
      switch (message) {
        case SNTP.time:
          //it is closed by itself on sucsess
          sntp = null;
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
    if (sntp) {
      try {
        sntp?.close();
      } catch (e) {}
    }
    sntp = null;
    bus.emit("stopped");
  }

  return {
    start,
    stop,
  };
}

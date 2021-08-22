import SNTP from "sntp";
import Time from "time";

export default function ({ bus, hosts }) {
  let sntp;
  function start() {
    let hostArr = hosts.split(",").map((x) => x.trim());
    sntp = new SNTP({ host: hostArr.shift() }, function (message, ts) {
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
          if (hostArr.length) {
            return hostArr.shift();
          } else {
            sntp = null;
            bus.emit("error");
          }

          break;
      }
    });
  }

  function stop() {
    if (sntp) {
      sntp.close();
      sntp = null;
    }
    bus.emit("stopped");
  }

  return {
    start,
    stop,
  };
}

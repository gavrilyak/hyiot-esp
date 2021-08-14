import { Server } from "http";
import Net from "net";

import otaHandler from "http-api-ota";
import prefsHandler from "http-api-prefs";
import staticHandler from "http-static";

const HANDLERS = [
  prefsHandler("/api/prefs"),
  otaHandler("/api/ota"),
  staticHandler(),
];

export default function ({ name = "httpserver", bus, port = 8080 } = {}) {
  let server = null;

  function start() {
    server = new Server({
      port,
    });
    //@ts-ignore there are some problems with upstream definition
    server.callback = function (message, path, method) {
      if (this.thisHandler) return this.thisHandler(message, path, method);
      if (message === Server.status) {
        bus.emit("log", { method, path });
        for (const handler of HANDLERS) {
          let res = handler.call(this, message, path, method);
          if (res) {
            this.thisHandler = handler;
            this.bus = bus;
            return;
          }
        }
        throw 404;
      }
    };

    bus.emit("started", { port, url: `http://${Net.get("IP")}:${port}` });
    trace(`${name} ready at http://${Net.get("IP")}:${port}/\n`);
  }

  function stop() {
    server?.close();
    server = null;
  }

  return {
    start,
    stop,
    depends: ["network"],
  };
}

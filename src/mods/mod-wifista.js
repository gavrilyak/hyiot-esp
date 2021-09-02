//import bus from "bus";
import WiFi from "wifi";
//import WiFi from "wificonnection";
import Net from "net";

export default function modWiFi({ name, bus, ...opts }) {
  let wifi;

  function start(...startOpts) {
    const { ssid, password } = { ...opts, ...startOpts };
    if (!ssid) {
      bus.emit("unfconfigured");
      return;
    } else {
      bus.emit("connecting", { ssid, password });
    }
    if (wifi) {
      trace("WIFI SECOND INSTANCE");
      debugger;
      return;
    }
    function callback(msg, code) {
      //trace("WIFI event", msg, code, "\n");
      switch (msg) {
        case WiFi.connected:
          {
            const ssid = Net.get("SSID");
            bus.emit("connected", { ssid });
          }
          break;

        case WiFi.disconnected:
          trace(
            code === -1 ? "Wi-Fi password rejected\n" : "Wi-Fi disconnected\n"
          );
          if (code === -1) {
            stop();
            bus.emit("unfconfigured");
          } else bus.emit("disconnected");
          break;

        case WiFi.gotIP:
          {
            const ip = Net.get("IP");
            //const mac = Net.get("MAC");
            bus.emit("started", { ip }); //, mac });
          }
          break;
      }
    }

    try {
      wifi = new WiFi({ ssid, password }, callback);
      WiFi.mode = 1;
    } catch (e) {
      bus.emit("error", e.message);
      stop();
    }
  }

  function stop() {
    if (wifi) {
      wifi.close();
      wifi = null;
    }
    bus.emit("stopped");
  }
  return {
    start,
    stop,
  };
}

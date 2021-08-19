//import bus from "bus";
//import WiFi from "wifi";
import WiFi from "wificonnection";
import Net from "net";

export default function modWiFi({ name, bus, ...opts }) {
  let wifi;

  function start() {
    const { ssid, password } = opts;
    if (!ssid) {
      bus.emit("unfconfigured");
      return;
    } else {
      bus.emit("connecting", { ssid, password });
    }

    wifi = new WiFi({ ssid, password }, function (msg, code) {
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
          } else bus.emit("unconfigure");
          break;

        case WiFi.gotIP:
          {
            const ip = Net.get("IP");
            //const mac = Net.get("MAC");
            bus.emit("started", { ip }); //, mac });
          }
          break;
      }
    });
    WiFi.mode = 1;
    return wifi;
  }

  function stop() {
    if (wifi) {
      wifi.close();
    }
    bus.emit("stopped");
  }
  return {
    start,
    stop,
  };
}

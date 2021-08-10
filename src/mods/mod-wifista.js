//import bus from "bus";
//import WiFi from "wifi";
import WiFi from "wificonnection";
import Net from "net";

export default function modWiFi({ name, bus, ...opts }) {
  function connectToWiFi() {
    const { ssid, password } = opts;

    if (!ssid) {
      bus.emit("unfconfigured");
      return;
    }

    const wifi = new WiFi({ ssid, password }, function (msg, code) {
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
          bus.emit("disconnected");
          break;

        case WiFi.gotIP:
          {
            const ip = Net.get("IP");
            const mac = Net.get("MAC");
            bus.emit("started", { ip, mac });
          }
          break;
      }
    });
    WiFi.mode = 1;
    return wifi;
  }

  bus.on("start", connectToWiFi);
}

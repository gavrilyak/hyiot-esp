import bus from "bus";
import WiFi from "wifi";
import Net from "net";

function connectToWiFi(message = {}) {
  const { ssid = "home", password = "Ochen'DlinniyParol'" } = message;
  const wifi = new WiFi({ ssid, password }, function (msg, code) {
    switch (msg) {
      case WiFi.connected:
        const ssid = Net.get("SSID");
        bus.emit("wifista_connected", { ssid });
        break;

      case WiFi.disconnected:
        trace(
          code === -1 ? "Wi-Fi password rejected\n" : "Wi-Fi disconnected\n"
        );
        bus.emit("wifista_disconnected");
        break;

      case WiFi.gotIP:
        const ip = Net.get("IP");
        bus.emit("wifista_started", { ip });
        wifi.close();
        break;
    }
  });
  WiFi.mode = 1;
  return wifi;
}

bus.on("wifista_start", connectToWiFi);

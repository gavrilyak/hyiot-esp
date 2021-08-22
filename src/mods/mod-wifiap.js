import Net from "net";
import WiFi from "wifi";
import { getMAC } from "native/esp32";

export default function ({ bus }) {
  WiFi.mode = 1; // to get MAC
  const ssid = "PROV_" + String(getMAC("sta")).slice(-8).replaceAll(":", "");
  function start() {
    WiFi.accessPoint({
      ssid,
      channel: 8,
      hidden: false,
    });
    bus.emit("started", { ssid, ip: Net.get("IP"), mac: getMAC("ap") });
  }

  function stop() {}
  return {
    start,
    stop,
  };
}

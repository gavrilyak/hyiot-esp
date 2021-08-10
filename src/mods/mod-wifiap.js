import Net from "net";
import WiFi from "wifi";
import { getMAC } from "main";
export default function ({ bus }) {
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

  bus.on("start", start);
  bus.on("stop", stop);
  return {
    start,
    stop,
  };
}

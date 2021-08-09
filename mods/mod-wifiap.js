import Net from "net";
import WiFi from "wifi";
export default function ({ bus }) {
  const ssid = "PROV_" + String(Net.get("MAC")).slice(-7).replaceAll(":", "");
  function start() {
    WiFi.accessPoint({
      ssid,
      channel: 8,
      hidden: false,
    });
    bus.emit("started", { ssid, ip: Net.get("IP") });
  }

  function stop() {}

  bus.on("start", start);
  bus.on("stop", stop);
  return {
    start,
    stop,
  };
}

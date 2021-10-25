//import bus from "bus";
import WiFi from "wifi";
import Timer from "timer";
import Net from "net";
import { set_wifi_ps } from "native/esp32";

export default function modWiFi({ name, bus, ...opts }) {
  let wifi;
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
          //Timer.set(() => set_wifi_ps(0), 1000);
        }
        break;
    }
  }

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
      return;
    }

    try {
      WiFi.mode = 1;
      wifi = new WiFi({ ssid, password }, callback);
    } catch (e) {
      bus.emit("error", e.message);
      stop();
    }
  }

  function stop() {
    if (wifi) {
      //set_wifi_ps(1);
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

import Timer from "timer";
import bus from "bus";
import { restart } from "main";
import WiFi from "wifi";

let timer;

bus.on("button_changed", (val) => {
  if (!val) {
    timer = Timer.set(() => {
      timer = null;
      trace(`REBOOT\n`);
      //restart();
      WiFi.disconnect();
      //bus.emit("mqtt_start");
    }, 2000);
  } else if (timer) {
    Timer.clear(timer);
    timer = null;
  }
});

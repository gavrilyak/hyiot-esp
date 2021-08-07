import Timer from "timer";
import bus from "bus";
import { restart } from "main";

let timer;

bus.on("button_changed", ({ payload }) => {
  if (!payload) {
    timer = Timer.set(() => {
      timer = null;
      trace(`REBOOT\n`);
      restart();
    }, 3000);
  } else if (timer) {
    Timer.clear(timer);
    timer = null;
  }
});

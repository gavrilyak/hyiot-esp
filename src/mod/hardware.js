import Digital from "embedded:io/digital";
import bus from "bus";

let isOnline = false;

bus.on("network/started", () => {
  isOnline = true;
});

bus.on("network/stopped", () => {
  isOnline = false;
});

const emit = (topic, payload) => {
  bus.emit(topic, payload);
  if (isOnline) {
    bus.emit("network/out", [topic, payload]);
  }
};

const led = new Digital({ pin: 2, mode: Digital.Output });

const button = new Digital({
  pin: 0, //device.pins.button,
  mode: Digital.InputPullUp,
  edge: Digital.Rising | Digital.Falling,
  onReadable() {
    let val = this.read();
    if (val != this.val) {
      this.val = val;
      led.write(!val);
      emit("button/changed", val);
      //bus.emit(val ? "network/start" : "network/stop");
    }
  },
});

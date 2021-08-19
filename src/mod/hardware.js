import Digital from "embedded:io/digital";
import Modules from "modules";
let canSend = false;

let emit;
if ("self" in globalThis) {
  emit = (topic, payload) => {
    if (canSend) self.postMessage([topic, payload]);
  };
  self.onmessage = (message) => {
    trace("MESSAGE:", message, "\n");
    canSend = true;
  };
} else {
  let bus = Modules.importNow("bus");
  emit = (topic, payload) => {
    if (canSend) bus.emit(topic, payload);
  };
  bus.on("hw/out", () => (canSend = true));
}

const led = new Digital({ pin: 2, mode: Digital.Output });

const button = new Digital({
  pin: 0, //device.pins.button,
  //invert: true,
  mode: Digital.InputPullUp,
  edge: Digital.Rising | Digital.Falling,
  onReadable() {
    let val = this.read();
    if (val != this.val) {
      this.val = val;
      led.write(!val);
      emit("button/changed", val);
    }
  },
});

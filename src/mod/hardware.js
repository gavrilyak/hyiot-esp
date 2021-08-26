import Digital from "embedded:io/digital";
import bus from "bus";
import Modules from "modules";
function probeSSD1306() {
  let I2C = Modules.importNow("pins/i2c");
  let i2c = new I2C({
    address: 0x3c,
    scl: 22,
    sda: 21,
    throw: false,
    timeout: 10,
  });
  i2c.write(0, false);
  let i2cres = i2c.read(1);
  let result = Boolean(i2cres && i2cres.length == 1);
  trace("i2cres:", result, "\n");
  return result;
}
probeSSD1306();

//led.write(1);

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

import Digital from "embedded:io/digital";
import bus from "bus";
import Timer from "timer";

const emit = (topic, payload) => {
  bus.emit(topic, payload);
  bus.emit("mqtt/pub", [topic, payload]);
};

/*
const button = new globalThis.Host.Button.Default({ onPush });
const led = new globalThis.Host.LED.Default();
function onPush() {
  let val = led.read();
  led.write(1 - val);
  bus.emit("button/pushed");
}
*/

const led = new Digital({ pin: 2, mode: Digital.Output });
const poweron = new Digital({ pin: 14, mode: Digital.Output });
	trace("power on\n")
poweron.write(1);
Timer.set(()=> {
	trace("power off\n");
	poweron.write(0)
}, 1000);

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
    }
  },
});

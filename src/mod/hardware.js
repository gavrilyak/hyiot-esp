import Digital from "embedded:io/digital";
import bus from "bus";
import Timer from "timer";

const emit = (topic, payload) => {
  bus.emit(topic, payload);
  bus.emit("mqtt/pub", [topic, payload]);
};

bus.emit("start", "ads1115");

bus.on("ads1115/started", ()=> {
  let ch=0;
  Timer.repeat(()=>{
    bus.emit("ads1115/measure", {ch, delay:10});
    ch = (ch + 1) % 12; 
  }, 300);
})

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

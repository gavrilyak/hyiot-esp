import Digital from "embedded:io/digital";
import bus from "bus";
import Timer from "timer";
import mod_ads1115 from "mod-ads1115"


/*
import PubSub from "pubsub";
const ads1115Bus = new PubSub();
const ads1115 = mod_ads1115({bus:ads1115Bus})
ads1115Bus.on("measured", console.log)
*/

/*
const emit = (topic, payload) => {
  bus.emit(topic, payload);
  bus.emit("mqtt/pub", [topic, payload]);
};

bus.emit("start", {name: "ads1115_0", mod:"mod-ads1115", address: 0x48, offset: 0});
bus.emit("start", {name: "ads1115_1", mod:"mod-ads1115", address: 0x49, offset: 4});
bus.emit("start", {name: "ads1115_2", mod:"mod-ads1115", address: 0x4A, offset: 8});
*/

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

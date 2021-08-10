import bus from "bus";
const Digital = device.io.Digital;
const led = new Digital({
  pin: 2, //device.pins.led,
  mode: Digital.Output,
});

led.write(0); // off
bus.on("led_set", ({ payload }) => led.write(payload));

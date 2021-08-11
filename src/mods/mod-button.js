import Digital from "embedded:io/digital";
export default function ({ bus }) {
  let digital;

  function start() {
    digital = new Digital({
      pin: 0, //device.pins.button,
      //invert: true,
      mode: Digital.InputPullUp,
      edge: Digital.Rising | Digital.Falling,
      onReadable() {
        let val = this.read();
        if (val != this.val) {
          this.val = val;
          bus.emit("changed", { payload: val });
          bus.emit(val ? "released" : "pressed");
        }
      },
    });
    bus.emit("started", { payload: digital.read() });
  }

  function stop() {
    digital?.close();
    digital = null;
  }

  return {
    start,
    stop,
  };
}

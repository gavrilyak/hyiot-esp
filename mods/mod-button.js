import bus from "bus";
const { Digital } = device.io;
const button = new Digital({
  pin: 0, //device.pins.button,
  //invert: true,
  //mode: Digital.InputPullUp,
  edge: Digital.Rising | Digital.Falling,
  onReadable() {
    let val = this.read();
    if (val != this.val) {
      this.val = val;
      bus.emit("button_changed", { payload: val });
    }
  },
});

//bus.emit("button_started", { payload: button.read() });

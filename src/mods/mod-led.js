import Digital from "embedded:io/digital";
let digital = null;

export default function LED({ bus, pin, mode = Digital.Output }) {
  function start() {
    if (digital) stop();
    digital = new Digital({ pin, mode });
    digital.write(0);
    bus.emit("started");
  }

  function stop() {
    digital?.close();
    digital = null;
    bus.emit("stopped");
  }

  const write = (val) => digital?.write(val);
  const on = () => write(true);
  const off = () => write(false);

  return {
    start,
    stop,
    on,
    off,
    write,
  };
}

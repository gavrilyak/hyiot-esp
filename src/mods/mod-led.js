import Digital from "embedded:io/digital";
let digital = null;

export default function LED({ pin, mode = Digital.Output }) {
  function start() {
    if (digital) stop();
    digital = new Digital({ pin, mode });
    digital.write(0);
  }

  function stop() {
    digital?.close();
    digital = null;
  }

  const set = ({ payload }) => digital?.write(payload);
  const on = () => set({ payload: true });
  const off = () => set({ payload: false });

  return {
    start,
    stop,
    on,
    off,
    set,
  };
}

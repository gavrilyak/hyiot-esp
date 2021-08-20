import Modules from "modules";

export default function ({ bus }) {
  function start() {
    try {
      Modules.importNow("setup_manual/piu")(() => {
        Modules.importNow("app")({ bus });
        bus.emit("started");
        return null;
      });
    } catch (e) {
      bus.emit("error", String(e));
    }
  }

  function stop() {
    trace("GUI Cannot be stopped\n");
  }

  return {
    start,
    stop,
  };
}

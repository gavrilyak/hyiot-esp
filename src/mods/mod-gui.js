import Modules from "modules";

export default function ({ bus }) {
  function realStart() {
    Modules.importNow("app")({ bus });
    bus.emit("started");
    return null;
  }

  function start() {
    const SETUP_PIU_MODULE = "setup_manual/piu";
    if (Modules.has(SETUP_PIU_MODULE)) {
      try {
        Modules.importNow("setup_manual/piu")(realStart);
      } catch (e) {
        bus.emit("error", String(e));
      }
    } else {
      realStart();
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

import Modules from "modules";

export default function ({ bus }) {
  function realStart() {
    Modules.importNow("app")({ bus });
    //bus.emit("started");
    return null;
  }

  function probeSSD1306() {
    let I2C = Modules.importNow("pins/i2c");
    let i2c = new I2C({
      address: 0x3c,
      scl: 22,
      sda: 21,
      throw: false,
      timeout: 10,
    });
    i2c.write(0, false);
    let i2cres = i2c.read(1);
    let result = Boolean(i2cres && i2cres.length == 1);
    return result;
  }

  function start() {
    const SETUP_PIU_MODULE = "setup_manual/piu";
    if (Modules.has(SETUP_PIU_MODULE)) {
      if (probeSSD1306()) {
        try {
          Modules.importNow("setup_manual/piu")(realStart);
        } catch (e) {
          bus.emit("error", String(e));
        }
      } else {
        bus.emit("error", "No SSD1306");
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

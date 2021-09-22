import {} from "piu/MC";
import globalBus from "bus";
import { getMAC } from "native/esp32";
const MAC =  "HL1-" + String(getMAC()).slice(-8).replaceAll(":", "");

const kbMap = {
  "\u001b[A": "up",
  "\u001b[B": "down",
  "\u001b[C": "right",
  "\u001b[D": "left",
};
const textStyle = new Style({
  //font: "OpenSans-Semibold-16",
  //font: "liberation-regular-14",
  font: "arial-regular-14",
  //font: "liberation-14",
  color: "white",
});

const readyText = new Label(null, {
  bottom: 31,
  style: textStyle,
  string: "Hello, world!",
});

const secondText = new Label(null, {
  bottom: 15,
  style: textStyle,
  string: "Second line",
});

const thirdText = new Label(null, {
  bottom: -1,
  style: textStyle,
  string: MAC,
});

const wifiIcon = new Content(null, {
  top: 1,
  right: 16 + 1,
  skin: new Skin({
    color: "white",
    texture: new Texture({
      path: "wifi-strip.png",
    }),
    width: 14,
    height: 14,
    states: 14,
    variants: 14,
  }),
  state: 0,
  variant: 0,
  _Behavior: class extends Behavior {
    onDisplaying(content) {
      content.interval = 1000;
      content.start();
    }
    onTimeChanged(content) {
      let variant = content.variant + 1;
      if (variant > 5) {
        variant = 0;
        content.state = content.state ? 0 : 1;
      }
      content.variant = variant;
    }
  },
});

const batteryIcon = new Content(null, {
  top: 0,
  right: 0,
  skin: new Skin({
    color: "white",
    texture: new Texture({
      path: "battery.png",
    }),
    width: 16,
    height: 16,
    states: 16,
    variants: 16,
  }),
  state: 0,
  variant: 0,
  _Behavior: class BatteryIconBehavior extends Behavior {
    onDisplaying(content) {
      content.interval = 1300;
      content.start();
    }
    onTimeChanged(content) {
      let variant = content.variant + 1;
      if (variant > 4) {
        variant = 0;
      }
      content.variant = variant;
    }
  },
});

const signalIcon = new Content(null, {
  top: 0,
  right: 32,
  skin: new Skin({
    color: "white",
    texture: new Texture({
      path: "signal.png",
    }),
    width: 16,
    height: 16,
    states: 16,
    variants: 16,
  }),
  state: 0,
  variant: 0,
  _Behavior: class extends Behavior {
    onDisplaying(content) {
      content.interval = 1500;
      content.start();
    }
    onTimeChanged(content) {
      let variant = content.variant + 1;
      if (variant > 3) {
        variant = 0;
      }
      content.variant = variant;
    }
  },
});

const bluetoothIcon = new Content(null, {
  skin: new Skin({
    color: "white",
    texture: new Texture({ path: "bluetooth.png" }),
    width: 16,
    height: 16,
  }),
  _Behavior: class extends Behavior {
    onDisplaying(content) {
      content.interval = 1900;
      content.start();
    }
    onTimeChanged(content) {
      content.visible = !content.visible;
    }
  },
  top: 0,
  right: 48,
});

const logoIcon = new Content(null, {
  skin: new Skin({
    color: "white",
    texture: new Texture({ path: "logo.png" }),
    width: 16,
    height: 16,
  }),
  top: 1,
  left: 1,
});

export default function ({ bus }) {
  bus.on("kb", function kb(payload) {
    let sym = payload in kbMap ? kbMap[payload] : payload;
    readyText.string = "KB:" + sym;
  });
  globalBus.on("ble/nason", function ({ pressure, temp, bat }) {
    readyText.string = pressure.toFixed(2) + " psi";
    secondText.string = String(temp.toFixed(1)) + " C";
    //thirdText.string = bat + "%";
  });
  return new Application(null, {
    displayListLength: 5632,
    //commandListLength: 3072,
    skin: new Skin({
      fill: "black",
    }),
    Behavior: class AppBehavior extends Behavior {
      onCreate(app) {
        app.add(logoIcon);
        app.add(bluetoothIcon);
        app.add(wifiIcon);
        app.add(signalIcon);
        app.add(batteryIcon);
        app.add(readyText);
        app.add(secondText);
        app.add(thirdText);
        bus.emit("started");
      }
    },
  });
}

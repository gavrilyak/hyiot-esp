import {} from "piu/MC";

const kbMap = {
  "\u001b[A": "up",
  "\u001b[B": "down",
  "\u001b[C": "right",
  "\u001b[D": "left",
};
const textStyle = new Style({
  font: "OpenSans-Semibold-16",
  color: "white",
});

const readyText = new Label(null, {
  top: 16,
  style: textStyle,
  string: "Hello, world!",
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
  Behavior: class extends Behavior {
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
  Behavior: class BatteryIconBehavior extends Behavior {
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
  Behavior: class extends Behavior {
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
  Behavior: class extends Behavior {
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

class AppBehavior extends Behavior {
  onCreate(app) {
    app.add(logoIcon);
    app.add(bluetoothIcon);
    app.add(wifiIcon);
    app.add(signalIcon);
    app.add(batteryIcon);
    app.add(readyText);
  }
}

export default function ({ bus }) {
  //if (globalThis.screen == null) throw Error("No screen");
  function start() {
    new Application(null, {
      //displayListLength: 5632,
      //commandListLength: 3072,
      skin: new Skin({
        fill: "black",
      }),
      Behavior: AppBehavior,
    });
    bus.emit("started");
    bus.on("kb", kb);
    return null;
  }
  function stop() {
    trace("GUI Cannot be stopped\n");
  }

  function kb(payload) {
    trace("KB", payload, "\n");
    let sym = payload in kbMap ? kbMap[payload] : payload;
    readyText.string = "KB:" + sym;
  }

  return {
    start,
    stop,
  };
}

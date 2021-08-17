import {} from "piu/MC";

const kbMap = {
  "\u001b[A": "up",
  "\u001b[B": "down",
  "\u001b[C": "right",
  "\u001b[D": "left",
};
const textStyle = new Style({
  font: "OpenSans-Semibold-16",
  color: "black",
});

const readyText = new Label(null, {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20,
  style: textStyle,
  string: "Hello world",
});

const wifiTexture = new Texture({
  path: "wifi-strip.png",
});

const wifiSkin = new Skin({
  texture: wifiTexture,
  width: 14,
  height: 14,
  states: 14,
  variants: 14,
});

class WifiIconBehavior extends Behavior {
  onDisplaying(content) {
    content.interval = 1000;
    content.start();
  }
  onTimeChanged(content) {
    let variant = content.variant + 1;
    if (variant > 4) {
      variant = 0;
      content.state = content.state ? 0 : 1;
    }
    content.variant = variant;
  }
}

const wifiIcon = new Content(null, {
  skin: wifiSkin,
  state: 0,
  variant: 0,
  Behavior: WifiIconBehavior,
  top: 1,
  right: 1,
});

class AppBehavior extends Behavior {
  onCreate(app) {
    app.add(readyText);
    app.add(wifiIcon);
  }
}

export default function ({ bus }) {
  //if (globalThis.screen == null) throw Error("No screen");
  function start() {
    new Application(null, {
      displayListLength: 5632,
      commandListLength: 3072,
      skin: new Skin({
        fill: "white",
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

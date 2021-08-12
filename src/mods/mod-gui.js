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

class AppBehavior extends Behavior {
  onCreate(app) {
    app.add(readyText);
  }
}

export default function ({ bus }) {
  function start() {
    if (!globalThis.pixelsOut) {
      bus.emit("no_screen");
      return;
    }
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

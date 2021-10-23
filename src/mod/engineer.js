import bus from "bus";
import { parse } from "mblike";
let engineerConnected = false;

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", "mb/w");
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/mb/w")) {
    let packet = parse(payload, true);
    if (!engineerConnected) {
      engineerConnected = true;
      bus.emit("engineer/connected");
    }
    bus.emit("engineer/write", packet);
  }
});

bus.on("engineer/write", (packet) => bus.emit("relay/write", packet));

bus.on("engineer/connected", () => {
  bus.emit("screen/stop");
  bus.on("relay/read", (packet) => {
    bus.emit("mqtt/pub", ["mb/r", packet.toBinary()]);
  });
});

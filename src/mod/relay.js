import bus from "bus";
import Timer from "timer";
import { parse, toAscii } from "mblike";

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", "mb/w");
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/mb/w")) {
    let packet = parse(payload, true);
    if (packet.isAscii) bus.emit("engineer/connected");
    bus.emit("engineer/write", packet);
  }
});

bus.on("engineer/write", (packet) => bus.emit("relay/write", packet));
bus.on("relay/write", (packet) => bus.emit("serial/write", packet.toAscii()));

bus.on("serial/read", (payload) => {
  try {
    let packet = parse(payload, false);
    bus.emit("relay/read", packet);
  } catch (e) {
    trace("UNABLE TO parse packet from relay:", e.message, "\n");
    trace("PACKET:", new Uint8Array(payload), "\n");
    bus.emit("relay/packetError", e);
  }
});

bus.on("engineer/connected", () => {
  bus.on("relay/read", (packet) => {
    bus.emit("mqtt/pub", ["mb/r", packet.toBinary()]);
  });
});

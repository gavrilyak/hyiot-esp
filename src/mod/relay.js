import bus from "bus";
import { parse } from "mblike";

const useBinary = true;

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", "mb>>");
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/mb>>")) {
    if (!useBinary) {
      bus.emit("serial/write", payload);
    } else {
      try {
        let packet = parse(payload, true);
        //trace(packet.toString(), "\n");
        bus.emit("serial/write", packet.toAscii());
      } catch (e) {
        trace("UNABLE TO parse mqtt incoming packet:", e.message, "\n");
        trace("PACKET:", new Uint8Array(payload), "\n");
      }
    }
  }
});

bus.on("serial/read", (payload) => {
  if (!useBinary) {
    bus.emit("mqtt/pub", ["mb<<", payload]);
  } else {
    try {
      let packet = parse(payload, false);
      //trace(packet.toString(), "\n");
      bus.emit("mqtt/pub", ["mb<<", packet.toBinary()]);
    } catch (e) {
      trace("UNABLE TO parse packet from relay:", e.message, "\n");
      trace("PACKET:", new Uint8Array(payload), "\n");
    }
  }
});

import bus from "bus";
import { parse } from "mblike";

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

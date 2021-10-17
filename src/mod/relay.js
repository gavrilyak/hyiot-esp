import bus from "bus";
import { parse, toAscii } from "mblike";

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", "mb>>");
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/mb>>")) {
    let packetAscii = toAscii(payload);
    let isAscii = packetAscii == payload;
    let onResponse = (response) => {
      try {
        if (!isAscii) response = parse(response).toBinary();
      } catch (e) {
        trace("UNABLE TO parse packet from relay:", e.message, "\n");
        trace("PACKET:", new Uint8Array(response), "\n");
      }
      bus.emit(["mqtt/pub", ["mb<<", response]]);
    };
    bus.emit("relay/write", [packetAscii, onResponse]);
  }
});

let inFlight = new Map();
let currentDestination = null;

bus.on("relay/write", ([payload, destination]) => {
  try {
    inFlight.set(payload, destination);
    bus.emit("serial/write", payload);
  } catch (e) {
    trace("UNABLE TO parse mqtt incoming packet:", e.message, "\n");
    trace("PACKET:", new Uint8Array(payload), "\n");
  }
});

bus.on("serial/written", (buf) => {
  if (inFlight.has(buf)) {
    let destination = inFlight.get(buf);
    currentDestination = destination;
    inFlight.delete(buf);
  } else {
    trace("UNEXPECTED, inFlight doesn't have this buf\n");
  }
});

bus.on("serial/read", (payload) => {
  if (currentDestination == null) {
    trace("NO DESTINATION!\n");
    return;
  }

  if (typeof currentDestination == "function") {
    currentDestination(payload);
  } else {
    bus.emit(currentDestination, payload);
  }
});

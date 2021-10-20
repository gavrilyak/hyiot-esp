import bus from "bus";
import Timer from "timer";
import { MasterWritePacket } from "mblike";
const KBPRESS_DELAY = 150;
const OFF = new Uint8Array([0]);

bus.on("mqtt/started", () => bus.emit("mqtt/sub", "kbd/+"));

bus.on("mqtt/message", ([topic, payload]) => {
  if (!topic.includes("/kbd/")) return;
  let [kbd, cmd] = topic.split("/").slice(-2);
  if (kbd != "kbd") return;
  switch (cmd) {
    case "raw":
      bus.emit("kbd/write", payload);
      break;
    case "press":
      bus.emit("kbd/press", payload);
      break;
    default:
      trace("Unrecognized keyboard command", cmd, "\n");
  }
});

function off() {
  bus.emit("kbd/write", OFF);
}

bus.on("kbd/press", (payload) => {
  let firstByte = new Uint8Array(payload)[0];
  switch (firstByte) {
    case 0x31:
    case 0x32:
    case 0x33:
    case 0x34:
    case 0x35:
    case 0x36: {
      bus.emit("kbd/write", new Uint8Array([1 << (0x36 - firstByte)]));
      Timer.set(off, KBPRESS_DELAY);
      break;
    }
    default:
      trace("Unsupported key:" + firstByte);
  }
});

bus.on("kbd/write", (payload) =>
  bus.emit("relay/write", new MasterWritePacket(0x6f4e, payload))
);

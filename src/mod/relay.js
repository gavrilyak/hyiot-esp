import bus from "bus";

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", "mb>>");
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/mb>>")) {
    bus.emit("serial/write", payload);
  }
});

bus.on("serial/read", (buf) => {
  let arr = new Uint8Array(buf);
  if (arr[0] != 58 || arr[1] != 0x30 || arr[2] != 0x31) {
    bus.emit("mqtt/pub", ["mbERROR", buf]);
    trace("BROKEN first byte ", arr[0], " len ", arr.length, "\n");
    //arr[0] = 58;
  }
  bus.emit("mqtt/pub", ["mb<<", buf]);
});

let testPacket = new Uint8Array([
  0x3a, 0x30, 0x31, 0x30, 0x33, 0x30, 0x30, 0x30, 0x30, 0x33, 0x31, 0x34, 0x30,
  0x34, 0x30, 0x34, 0x42, 0x0d, 0x0a,
]).buffer;

testPacket = ArrayBuffer.fromString(":01030000030040B9\r\n");
testPacket = ArrayBuffer.fromString(":010300003A404042\r\n");

bus.on("#serial/started", () => {
  Timer.repeat(() => {
    bus.emit("serial/write", testPacket);
  }, 20);
});

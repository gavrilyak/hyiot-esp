import bus from "bus";
bus.on("mqtt/started", () => {
  bus.on("ble/nason", (payload) => {
    bus.emit("mqtt/pub", ["nason", JSON.stringify(payload)]);
  });
});

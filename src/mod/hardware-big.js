import bus from "bus";
import { loadAndInstantiate } from "modLoader";
// import { measure } from "profiler";
// import race from "waitForMultiple";
// import join from "waitForAll";
// import sleep from "sleep";
import initialConfig from "config";
//import coro from "coro";

loadAndInstantiate("button", initialConfig["button"]);
loadAndInstantiate("led", initialConfig["led"]);

bus.on("*", (topic, payload) => {
  trace(
    `BUS ${new Date().toISOString()} ${topic} ${
      payload ? JSON.stringify(payload) : ""
    }\n`
  );
});

bus.on("button/changed", ({ payload }) => {
  bus.emit("led/write", { payload: !payload });
});
/*
function* waitEvent(topic) {
  const cont = yield coro;
  bus.once(topic, (event) => cont(null, event));
  return yield;
}

function* hwManager() {
  trace("HW starting:\n");
  const button = loadAndInstantiate("button", initialConfig["button"]);
  const led = loadAndInstantiate("led", initialConfig["led"]);
  bus.emit("button/start");
  bus.emit("led/start");
  let { index } = yield* race([
    join([waitEvent("button/started"), waitEvent("led/started")]),
    sleep(1000),
  ]);
  if (index === 1) {
    trace("HW failed to start\n");
    return 1;
  }

  trace("HW started\n");
  for (;;) {
    const val = yield* waitEvent("button/changed");
    // bus.emit("mqtt/pub", {
    //   topic: `${MQTT_NS}/button`,
    //   payload: String(val),
    // });
    bus.emit("led/write", !val);
    measure("BUTTON");
  }
}

coro(hwManager(), (err, res) => {
  trace("HW handler,", err, ",", res, "\n");
  if (err === coro) trace("HW CORO ERR", res, "\n");
});

*/

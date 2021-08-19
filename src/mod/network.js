import initialConfig from "config";
import bus from "bus";
import { loadAndInstantiate } from "modLoader";
import coro from "coro";
import sleep from "sleep";
import Timer from "timer";
import getBlob from "getBlob";
import getCertSubject from "getCertSubject";
import { measure } from "profiler";
import Modules from "modules";
let deviceId = "device1";
try {
  deviceId = getCertSubject(getBlob("fctry://l/device.der"))?.CN;
} catch (e) {
  trace("No certificate found, using default deviceId");
}
const MQTT_NS = deviceId;

bus.on("*", (payload, topic) => {
  trace(
    `NETWORK BUS ${new Date().toISOString()} ${topic} ${
      payload != null ? JSON.stringify(payload) : ""
    }\n`
  );

  if (topic.endsWith("started")) {
    measure(topic);
  }
});

/**
 * @param {string[]} topics
 */
function* once(...topics) {
  const cont = yield coro;
  const listener = (payload, topic) => {
    cont(null, [topic, payload]);
    topics.forEach((topic) => bus.off(topic, listener));
  };
  topics.forEach((topic) => bus.on(topic, listener));
  return yield;
}

function* stopWifiSta() {
  bus.emit("wifista/stop");
  yield* once("wifista/stopped");
}

bus.on("start", (event) => {
  const { name, ...opts } = typeof event === "string" ? { name: event } : event;
  loadAndInstantiate(name, { ...initialConfig[name], ...opts });
  bus.emit(`${name}/start`);
});

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", { topic: `${MQTT_NS}/hello` });
  bus.emit("mqtt/sub", { topic: `${MQTT_NS}/led` });
  bus.emit("mqtt/sub", { topic: `${MQTT_NS}/kb` });
  bus.emit("mqtt/sub", { topic: `${MQTT_NS}/button` });
  Timer.set(() => {
    bus.emit("mqtt/pub", {
      topic: `${MQTT_NS}/hello`,
      payload: JSON.stringify({ who: "world" }),
    });
  }, 100);
});

function* networkManager() {
  bus.emit("start", "wifista");
  let errorCounter = 0;
  for (let restartCounter = 0; ; restartCounter++) {
    bus.emit("nm/starting", { restartCounter, errorCounter });

    bus.emit("wifista/start");
    const [topic] = yield* once(
      "wifista/started",
      "wifista/disconnected",
      "wifista/unfconfigured"
    );
    if (topic != "wifista/started") {
      errorCounter++;
      yield* stopWifiSta();
      if (errorCounter < 3) {
        continue;
      }
      errorCounter = 0;

      if (restartCounter === 0) {
        bus.emit("start", "wifiap");
        yield* once("wifiap/started");

        bus.emit("start", "telnet");
        yield* once("telnet/started");

        bus.emit("start", "httpserver");
        yield* once("httpserver/started");

        yield* sleep(60000);
        return;
      }
      trace("Try to START MODEM?\n");
      continue;
    } else {
      bus.emit("start", "sntp");
      bus.emit("start", "telnet");
      const [topic] = yield* once("sntp/started", "sntp/error");
      if (topic == "sntp/started") {
        bus.emit("start", { name: "mqtt", id: deviceId });
        let [topic, payload] = yield* once(
          "mqtt/started",
          "mqtt/error",
          "mqtt/stopped"
        );
        if (topic === "mqtt/started") {
          trace("NM MQTT started", payload, "\n");
        }
      } else {
        bus.emit("telnet/stop");
        bus.emit("sntp/stop");
        yield* sleep(100);
        continue;
        //no sntp - no time - no ssl
      }

      yield* once(
        "wifista/stopped",
        "wifista/disconnected",
        "wifista/unfconfigured"
      );

      bus.emit("mqtt/stop");
      bus.emit("telnet/stop");
      bus.emit("sntp/stop");
      yield* stopWifiSta();
      bus.emit("nm/restarted");
      yield* sleep(500);
    }
  }
}

coro(networkManager(), (err, res) => {
  trace("NM handler,", err, ",", res, "\n");
  if (err === coro) trace("NM CORO ERR", res, "\n");
});

function startScreen() {
  let device = globalThis.device;
  if (device) {
    try {
      let SMBus = Modules.importNow("pins/smbus");
      let io = new SMBus({ address: 60 });
      io.readByte(0);
    } catch (e) {
      trace("No SSD screen here, gui won't start\n");
      return;
    }
  }
  let setup = Modules.importNow("setup_manual/piu");
  setup(() => {
    bus.emit("start", "gui");
  });
}

startScreen();

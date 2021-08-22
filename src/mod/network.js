import initialConfig from "config";
import bus from "bus";
import { loadAndInstantiate } from "modLoader";
import coro from "coro";
import sleep from "sleep";
import Timer from "timer";
import { measure } from "profiler";
import race from "waitForMultiple";

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
bus.on("pref/changed", (val) => {
  for (const [ns, value] of Object.entries(val)) {
    bus.emit(`${ns}/reconfigured`, value);
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
  bus.emit("mqtt/sub", "hello");
  bus.emit("mqtt/sub", `led`);
  bus.emit("mqtt/sub", `kb`);
  bus.emit("mqtt/sub", `button`);
  Timer.set(() => {
    bus.emit("mqtt/pub", [`hello`, JSON.stringify({ who: "world" })]);
  }, 100);
});

function* networkManager() {
  let errorCounter = 0;
  loadAndInstantiate("pref");
  loadAndInstantiate("wifista");

  for (let restartCounter = 0; ; ) {
    bus.emit("nm/starting", { restartCounter, errorCounter });

    bus.emit("mqtt/stop");
    bus.emit("telnet/stop");
    bus.emit("httpserver/stop");
    bus.emit("sntp/stop");
    bus.emit("wifista/stop");
    bus.emit("wifiap/stop");

    bus.emit("start", "wifista");
    const [topic] = yield* once(
      "wifista/started",
      "wifista/disconnected",
      "wifista/unfconfigured"
    );
    if (topic != "wifista/started") {
      errorCounter++;
      yield* stopWifiSta();

      if (topic == "wifista/disconnected" && errorCounter < 3) continue;

      //many errrors
      errorCounter = 0;
      if (restartCounter++ === 0) {
        bus.emit("start", "wifiap");
        yield* once("wifiap/started");

        bus.emit("start", "telnet");
        yield* once("telnet/started");

        bus.emit("start", "httpserver");
        yield* once("httpserver/started");

        let { index } = yield* race([
          once("wifista/reconfigured"),
          sleep(5 * 60 * 1000), //5 minutes
        ]);

        if (index == 0) {
          trace("New config!!");
        }
        continue;
      } else {
        trace("Try to START MODEM?\n");
        yield* sleep(60000);
        //Modules.importNow("esp32").restart();
      }
      continue;
    } else {
      bus.emit("start", "sntp");
      bus.emit("start", "telnet");
      //bus.emit("start", "httpserver");
      const [sntpTopic] = yield* once("sntp/started", "sntp/error");
      if (sntpTopic == "sntp/started") {
        trace("NO TIME\n");
      }
      bus.emit("start", "mqtt");

      let [topic] = yield* once("mqtt/started", "mqtt/error", "mqtt/stopped");
      if (topic != "mqtt/started") continue;
      //} else {
      //}
    }

    bus.emit("nm/success");
    let [restartTopic] = yield* once(
      "wifista/stopped",
      "wifista/disconnected",
      "wifista/unfconfigured",
      "mqtt/stopped"
    );
    bus.emit("nm/restarted", { cause: restartTopic });
  }
}

coro(networkManager(), (err, res) => {
  trace("NM handler,", err, ",", res, "\n");
  if (err === coro) trace("NM CORO ERR", res, "\n");
});

bus.emit("start", "tz");
bus.emit("start", "gui");
bus.emit("start", "ble");

if ("self" in globalThis) {
  self.onmessage = ([topic, payload]) => {
    bus.emit(topic, payload);
  };
}

import Modules from "modules";
import bus from "bus";
import Net from "net";
import Timer from "timer";
import { measure } from "profiler";
import getDefaultDeviceId from "getDefaultDeviceId";
import Worker from "worker";
import sleep from "sleep";
//this is for side effect
import { loadAndInstantiate } from "modLoader";
import Digital from "embedded:io/digital";

if (Modules.has("rc-local")) Modules.importNow("rc-local");

measure("start");

const IS_SIMULATOR = !Modules.has("flash"); //!("device" in globalThis);
//trace("BOOTING, build: ", getBuildString(), "\n");
//trace("FW_VERSION:", globalThis.FW_VERSION, "\n");
//trace("HOST MODULES:", Modules.host, "\n");
//trace("ARCHIVE MODULES:", Modules.archive, "\n");
trace("IS_SIMULATOR:", IS_SIMULATOR, "\n");
//trace("GLOBAL:", Object.keys(globalThis), "\n");

//THIS is NECCESSARY for network stack initialization
//import WiFi from "wifi";
//WiFi.mode = 0;
//
const hasModem = !new Digital({ pin: 27, mode: Digital.InputPullUp }).read();
trace("Has modem:", hasModem, "\n");

const led = new Digital({ pin: 23, mode: Digital.Output });
led.write(1); // on
function startHw() {
  if (!IS_SIMULATOR) {
    trace("DEFAULT DEVICE ID:", getDefaultDeviceId(), "\n");
    Modules.importNow("hardware");
    Modules.importNow("virtmodem");
    Modules.importNow("relay");
  }
}

import coro from "coro";
function* start(name) {
  let cont = yield coro;
  const listener = (payload) => cont(null, payload);
  const topic = name + "/started";
  bus.on(topic, listener);
  try {
    bus.emit("start", name);
    return yield;
  } finally {
    bus.off(topic, listener);
  }
}

function* startSequence() {
  startHw();
  bus.emit("start", "pref");
  bus.emit("start", "tz");
  //bus.emit("start", "modem");
  //bus.emit("start", "gui");
  //bus.emit("start", "ble");
  bus.emit("start", "serial");
  if (!hasModem) bus.emit("start", "virtmodem"); //{name: "virtmodem", mod:"serial"});
  let startModem = hasModem;
  let startWifi = !hasModem;
  if (startModem) {
    bus.emit("start", "modem");
    //yield* start("wifiap");
    //yield* start("httpserver");
    //yield* start("telnet");
  } else if (startWifi) {
    for (;;) {
      yield* sleep(500); // this sleep improves a chance to connect :-)
      bus.emit("start", "wifista");
      let [topic] = yield* once(
        "wifista/started",
        "wifista/unfconfigured",
        "wifista/error"
      );
      if (topic == "wifista/unfconfigured") {
        yield* start("wifiap");
      } else if (topic == "wifista/error") {
        bus.emit("wifista/stop");
        yield* sleep(1000);
        continue;
      } else if (topic == "wifista/started") {
        yield* start("sntp");
        yield* start("mqtt");
      }
      yield* start("telnet");
      break;
    }
    //yield* start("lineserver");
  }
  //yield* start("wifiap");
  //yield* start("httpserver");
  //yield* start("telnet");
}

/**
 * @param {string[]} topics
 */
function* once(...topics) {
  const cont = yield coro;
  const listener = (payload, topic) => {
    cont(null, [topic, payload]);
    topics.forEach((topic) => bus.off(topic, listener));
  };
  try {
    topics.forEach((topic) => bus.on(topic, listener));
    return yield;
  } finally {
    topics.forEach((topic) => bus.off(topic, listener));
  }
}

function* mqttSaga() {
  let restart = false;
  for (;;) {
    if (restart) yield* sleep(1000);
    else yield* once("mqtt/start");
    trace("restarting");

    let worker = new Worker("mqtt-worker", {
      allocation: 38 * 1024,
      stackCount: 256, //4Kb
      //slotCount: 200,
    });
    worker.onmessage = ([topic, payload]) => bus.emit("mqtt/" + topic, payload);
    let [topic, payload] = yield* once(
      "mqtt/started",
      "mqtt/error",
      "mqtt/stopped"
    );
    if (topic === "mqtt/started") {
      restart = false;
      try {
        for (;;) {
          const proxyTopics = [
            "mqtt/pub",
            "mqtt/sub",
            "mqtt/unsub",
            "mqtt/stop",
          ];
          let [topic, payload] = yield* once(...proxyTopics, "mqtt/stopped");
          trace("SAGA", topic, ",", payload, "\n");
          if (proxyTopics.indexOf(topic) >= 0) {
            worker.postMessage([topic.slice(5), payload]);
          }
          if (topic === "mqtt/stop") {
            yield* once("mqtt/stopped");
            break;
          } else if (topic == "mqtt/stopped") {
            restart = true;
            break;
          }
        }
      } catch (e) {
        trace("ERROR in saga:", e.message, "\n");
      } finally {
        trace("terminating\n");
        worker.terminate();
      }
    } else {
      worker.terminate();
      trace("ERROR starting worker", topic, payload, "\n");
      restart = false;
    }
  }
}

bus.on("modem/connected", () => {
  trace("IP", Net.get("IP"), "\n");
  trace("DNS", Net.get("DNS"), "\n");
  bus.emit("start", "telnet");
  Net.resolve("pool.ntp.org", (name, host) => {
    if (!host) {
      trace("Unable to resolve sntp host\n");
      return;
    }
    trace(`resolved ${name} to ${host}\n`);
    bus.emit("start", "sntp");
  });
});

bus.on("sntp/started", () => {
  //bus.emit("mqtt/start");
  bus.emit("start", "mqtt");
});

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", "ping");
  bus.emit("mqtt/pub", [
    `hello`,
    JSON.stringify({ ip: Net.get("IP"), hasModem }),
  ]);
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/ping")) {
    bus.emit("mqtt/pub", ["pong", payload]);
  }
});

function startAsync() {
  //coro(mqttSaga());
  coro(startSequence(), (err, res) => {
    trace("coro", err, res, "\n");
    //bus.emit("mqtt/start");
    //startMQTT();
  });
}

bus.on("wifista/started", () => {
  bus.emit("network/online");
});

bus.on("network/online", () => {
  bus.emit("start", "sntp");
  bus.emit("start", "telnet");
});

function simpleStart() {
  startHw();
  bus.emit("start", "pref");
  bus.emit("start", "tz");
  //bus.emit("start", "modem");
  //bus.emit("start", "gui");
  //bus.emit("start", "ble");
  bus.emit("start", "serial");
  if (!hasModem) bus.emit("start", "virtmodem"); //{name: "virtmodem", mod:"serial"});
  bus.emit("start", "wifista");
}

//startAsync();
simpleStart();

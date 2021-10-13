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
bus.on("*", (payload, topic) => {
  //if(topic.endsWith("/measure") || topic.endsWith("/measured")) return;
  if (topic.startsWith("mqtt")) return;
  if (topic.endsWith("/read") || topic.endsWith("/write")) return;
  trace(
    `MAIN BUS ${new Date().toISOString()} ${topic} ${
      payload != null ? JSON.stringify(payload) : ""
    }\n`
  );
  //measure(topic);
});

function startHw() {
  if (!IS_SIMULATOR) {
    trace("DEFAULT DEVICE ID:", getDefaultDeviceId(), "\n");
    Modules.importNow("hardware");
    Modules.importNow("virtmodem");
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
  //bus.emit("start", "mqtt");
});

bus.on("mqtt/started", () => {
  Timer.set(() => {
    bus.emit("mqtt/sub", "mb>>");
    bus.emit("mqtt/sub", "ping");
    // bus.emit("mqtt/sub", "hello");
    // bus.emit("mqtt/sub", `led`);
    // bus.emit("mqtt/sub", `kb`);
    // bus.emit("mqtt/sub", `button`);
    // bus.emit("mqtt/sub", "$jobs/$next/get/accepted");
    // bus.emit("mqtt/sub", "$jobs/notify-next");
  }, 50);
  Timer.set(() => {
    bus.emit("mqtt/pub", [
      `hello`,
      JSON.stringify({ ip: Net.get("IP"), hasModem }),
    ]);
    //bus.emit("mqtt/pub", ["$jobs/$next/get", "{}"]);
  }, 100);

  bus.on("ble/nason", (payload) => {
    bus.emit("mqtt/pub", ["nason", JSON.stringify(payload)]);
  });
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/mb>>")) {
    bus.emit("serial/write", payload);
  } else if (topic.endsWith("/ping")) {
    bus.emit("mqtt/pub", ["pong", payload]);
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

function startAsync() {
  //coro(mqttSaga());
  coro(startSequence(), (err, res) => {
    trace("coro", err, res, "\n");
    //bus.emit("mqtt/start");
    //startMQTT();
  });
}

startAsync();

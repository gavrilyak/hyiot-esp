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
  bus.emit("start", "virtmodem"); //{name: "virtmodem", mod:"serial"});
  bus.emit("start", "serial");
  let startModem = 0;
  let startWifi = 1;
  if (startModem) {
    //bus.emit("start", "modem");
    yield* start("wifiap");
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
    bus.emit("mqtt/pub", [`hello`, JSON.stringify({ who: "world" })]);
    //bus.emit("mqtt/pub", ["$jobs/$next/get", "{}"]);
  }, 100);

  bus.on("ble/nason", (payload) => {
    bus.emit("mqtt/pub", ["nason", JSON.stringify(payload)]);
  });
});

const OK_RESPONSE = ArrayBuffer.fromString("OK\r\n");
const CONNECT_RESPONSE = ArrayBuffer.fromString("CONNECT\r\n");

const ENABLE_TRAFIC = 0;
const traffic = (() => {
  let _arr = new Uint8Array(new ArrayBuffer(512));
  return (what, buf) => {
    let src = new Uint8Array(buf);
    for (let i = 0, l = src.length; i < l; i++) _arr[i] = src[i] & 0x7f;
    _arr[src.length] = 0;
    trace(what, " ", String.fromArrayBuffer(_arr.buffer));
  };
})();

function handleVirtualModem(buf) {
  let arr = new Uint8Array(buf);
  let emits = [];
  if (arr[0] == 43 && arr[1] == 43 && arr[2] == 43) {
    // "+++"
    emits.push("write", OK_RESPONSE);
  } else if (arr[0] == 65 && (arr[1] == 84 || arr[1] == 212)) {
    // AT or AT&0x80 parity bit
    for (let i = 0, l = arr.length; i < l; i++) arr[i] &= 0x7f; // clear parity bits
    if (arr[2] == 68 && arr[3] == 84) {
      // DT
      emits.push("write", CONNECT_RESPONSE);
      emits.push("connected", {
        num: String.fromArrayBuffer(buf.slice(4, -1)).trim(),
      });
    } else if (arr[2] == 72) {
      // ATH
      emits.push("write", OK_RESPONSE);
      emits.push("virtmodem/disconnected", null);
    } else {
      emits.push("write", OK_RESPONSE);
    }
  } else if (arr[0] == 0x3a && arr[1] == 0x30 && (arr[2] & 0x7f) == 0x32) {
    emits.push("write", OK_RESPONSE);
  }
  return emits.length ? emits : null;
}

bus.on("virtmodem/read", (buf) => {
  let emits = handleVirtualModem(buf);
  if (emits) {
    for (let i = 0; i < emits.length; i += 2) {
      let topic = emits[i];
      let payload = emits[i + 1];
      if (ENABLE_TRAFIC && topic == "write") traffic("<-", payload);
      bus.emit(`virtmodem/${topic}`, payload);
    }
  } else {
    bus.emit("remote/write", buf);
  }
  if (ENABLE_TRAFIC) traffic(">>", buf);
});

let remote = getDefaultDeviceId();
bus.on("virtmodem/connected", ({ num }) => {
  remote = num;
  bus.emit("mqtt/sub", `$direct/${remote}/mb<<`);
});

bus.on("virtmodem/disconnected", ({ num }) => {
  bus.emit("mqtt/unsub", `$direct/${remote}/mb<<`);
  remote = getDefaultDeviceId();
});

bus.on("remote/write", (buf) => {
  //Timer.set(() => {
  if (remote) bus.emit("mqtt/pub", [`$direct/${remote}/mb>>`, buf]);
  //}, 70);
});

bus.on("operator/write", (buf) => {
  //Timer.set(() => {
  bus.emit("mqtt/pub", ["mb<<", buf]);
  if (ENABLE_TRAFIC) traffic("<<", buf);
  //}, 10);
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/mb>>")) {
    bus.emit("serial/write", payload);
  } else if (topic.endsWith("/mb<<")) {
    bus.emit("virtmodem/write", payload);
  } else if (topic.endsWith("/ping")) {
    trace("PING");
    bus.emit("mqtt/pub", ["pong", payload]);
  }
});

bus.on("serial/read", (buf) => {
  bus.emit("operator/write", buf);
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

/*
 * Copyright (c) 2016-2020 Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 *
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */

import Modules from "modules";
import bus from "bus";
import { measure } from "profiler";
//this is for side effect
import { loadAndInstantiate } from "modLoader";
measure("start");

const IS_SIMULATOR = !Modules.has("flash"); //!("device" in globalThis);
//trace("BOOTING, build: ", getBuildString(), "\n");
trace("FW_VERSION:", globalThis.FW_VERSION, "\n");
//trace("HOST MODULES:", Modules.host, "\n");
//trace("ARCHIVE MODULES:", Modules.archive, "\n");
trace("IS_SIMULATOR:", IS_SIMULATOR, "\n");
//trace("GLOBAL:", Object.keys(globalThis), "\n");

bus.on("*", (payload, topic) => {
  trace(
    `MAIN BUS ${new Date().toISOString()} ${topic} ${
      payload != null ? JSON.stringify(payload) : ""
    }\n`
  );
  //measure(topic);
});

function startHw() {
  if (!IS_SIMULATOR) Modules.importNow("hardware");
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

//startHw();
function* startSequence() {
  startHw();
  bus.emit("start", "pref");
  bus.emit("start", "tz");
  //bus.emit("start", "modem");
  bus.emit("start", "serial");
  //bus.emit("start", "gui");
  const mods = [
    //"tz",
    //"wifista",
    //"sntp",
    //"mqtt",
    "wifiap",
    "telnet",
    //"httpserver",
    //"ble",
  ];
  for (let modName of mods) {
    yield* start(modName);
    measure("Started " + modName);
  }
}

import Worker from "worker";
//bus.on("mqtt/start", startMQTT);
function startMQTT() {
  let worker = new Worker("mqtt-worker", {
    //allocation: 63 * 1024,
    allocation: 33 * 1024,
    stackCount: 256,
    //slotCount: 200,
  });

  worker.onmessage = ([topic, payload]) => {
    bus.emit("mqtt/" + topic, payload);
  };

  function sendToWorker(payload, topic) {
    worker.postMessage([topic.slice(5), payload]);
  }

  function stopped() {
    worker.terminate();
    worker = null;
  }

  function stop() {
    bus.off("mqtt/pub", sendToWorker);
    bus.off("mqtt/sub", sendToWorker);
    bus.off("mqtt/unsub", sendToWorker);
    bus.off("mqtt/stop", stop);

    worker.postMessage(["stop"]);
    bus.once("mqtt/stopped", stopped);
  }

  function onStarted() {
    bus.on("mqtt/pub", sendToWorker);
    bus.on("mqtt/sub", sendToWorker);
    bus.on("mqtt/unsub", sendToWorker);
    bus.on("mqtt/stop", stop);
  }

  bus.once("mqtt/started", onStarted);
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

import sleep from "sleep";

function* mqttSaga() {
  let restart = false;
  for (;;) {
    if (restart) yield* sleep(1000);
    else yield* once("mqtt/start");

    let worker = new Worker("mqtt-worker", {
      allocation: 33 * 1024,
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
        worker.terminate();
      }
    } else {
      trace("ERROR starting worker", topic, payload, "\n");
      restart = true;
    }
  }
}

function startAsync() {
  coro(mqttSaga());
  coro(startSequence(), (err, res) => {
    trace("coro", err, res, "\n");
    //bus.emit("mqtt/start");
    //startMQTT();
  });
}

function startSequenceEvents() {
  bus.emit("start", "pref");
  bus.emit("start", "tz");
  bus.emit("start", "wifista");
  bus.on("wifista/started", () => {
    bus.emit("start", "mqtt");
    bus.emit("start", "telnet");
  });

  bus.on("mqtt/started", () => {
    bus.emit("start", "gui");
  });

  bus.on("gui/started", () => {
    bus.emit("start", "ble");
  });
}

//startSequenceEvents();
startAsync();

//bus.emit("start", "gui");
//bus.emit("start", { name: "network", inWorker: true });
//bus.emit("start", "ble");

//loadAndInstantiate("network", { inWorker: false }); //!IS_SIMULATOR });
//bus.emit("network/start");

/*
let mods = {};

for (let [name, initialSettings] of Object.entries(initialConfig)) {
  try {
    mods[name] = loadAndInstantiate(name, initialSettings);
  } catch (e) {
    trace(`Module ${name} not loaded, error: ${e}\n`);
  }
}*/

//measure("aftermain");

/*
Timer.set(() => {
  bus.emit("button/start");
  bus.emit("led/start");
  bus.emit("wifista/start");
  bus.emit("gui/start");
});

bus.on("wifista/started", () => {
  bus.emit("network/started");
});

bus.on("wifista/disconnected", () => {
  bus.emit("network/stopped");
});

bus.on("wifiap/started", () => {
  bus.emit("telnet/start");
  bus.emit("httpserver/start");
  bus.emit("otaserver/start");
});

bus.on("wifista/unfconfigured", () => {
  bus.emit("wifiap/start");
});

bus.on("network/started", () => {
  bus.emit("sntp/start");
  bus.emit("otaserver/start");
  bus.emit("telnet/start");
  bus.emit("httpserver/start");

  bus.on("sntp/started", () => {
    measure("SNTP Started");
    bus.emit("mqtt/start");
  });
  bus.on("sntp/error", () => {
    //TODO: restart wifi?
  });
});

bus.on("network/stopped", () => {
  bus.emit("mqtt/stop");
  bus.emit("telnet/stop");
  bus.emit("httpserver/stop");
  bus.emit("otaserver/stop");
});

bus.on("mqtt/message", ({ topic, payload }) => {
  if (topic === `${MQTT_NS}/led`) {
    bus.emit("led/write", { payload: JSON.parse(payload) });
  }
  if (topic === `${MQTT_NS}/kb`) {
    bus.emit("gui/kb", payload);
  }
});

bus.on("button/pressed", () => {
  trace.left("on");
});

bus.on("button/released", () => {
  trace.right("off");
});

bus.on("ota/finished", () => {
  trace("Restarting with new version\n");
  restart();
});
*/

/*
bus.on("button/changed", ({ payload }) => {
  bus.emit("mqtt/pub", {
    topic: `${MQTT_NS}/button`,
    payload: String(payload),
  });
  bus.emit("led/write", { payload: !payload });
});
*/

//measure("Started");

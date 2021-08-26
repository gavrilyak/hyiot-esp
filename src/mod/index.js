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
import { loadAndInstantiate } from "modLoader";
import initialConfig from "config";
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
  measure(topic);
});

bus.on("start", (event) => {
  const { name, ...opts } = typeof event === "string" ? { name: event } : event;
  loadAndInstantiate(name, { ...initialConfig[name], ...opts });
  bus.emit(`${name}/start`);
});

function startHw() {
  if (!IS_SIMULATOR) Modules.importNow("hardware");
}

startHw();
loadAndInstantiate("network", { inWorker: true }); //!IS_SIMULATOR });
bus.emit("network/start");
bus.emit("start", "tz");

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

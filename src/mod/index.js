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
import hostConfig from "mc/config";
import modConfig from "mod/config";
import pref from "preference";
import Resource from "Resource";
import Net from "net";
import tryJSON from "tryJSON";
import Timer from "timer";
//import WiFi from "wifi";

function makePrefixedBus(prefix) {
  return {
    on(topic, handler) {
      bus.on(`${prefix}_${topic}`, handler);
    },
    off(topic, handler) {
      bus.off(`${prefix}_${topic}`, handler);
    },
    emit(topic, ...payload) {
      bus.emit(`${prefix}_${topic}`, ...payload);
    },
  };
}
import { print, getBuildString, getMAC } from "main";

print("MOD");
trace(`BOOTING, build: ${getBuildString()}\n`);
trace(`MAC NET, ${Net.get("MAC")}\n`);
trace(`MAC STA, ${getMAC("sta")}\n`);
trace(`MAC AP, ${getMAC("ap")}\n`);

trace(`HOST MODULES: ${Modules.host}\n`);
trace(`ARCHIVE MODULES: ${Modules.archive}\n`);
trace(`MOD CONFIG: ${JSON.stringify(modConfig.mods)}\n`);
trace(`RESOURCES: ${[...Resource]}\n`);

let mods = {};
const MOD_PREFIX = "mod-";

for (const fullName of [...Modules.host, ...Modules.archive]) {
  if (!fullName.startsWith(MOD_PREFIX)) continue;

  trace(`loading ${fullName}\n`);
  let mod = Modules.importNow(fullName);
  let name = fullName.slice(MOD_PREFIX.length);
  if (typeof mod != "function") {
    trace(`${fullName} not a module, skipping...\n`);
    continue;
  }
  trace(`instantiating ${fullName}\n`);
  //let bus = new PrefixedBus(name);
  let bus = makePrefixedBus(name);
  const hostOpts = "mods" in hostConfig ? hostConfig.mods[name] : {};
  const modOpts = modConfig.mods[name] || {};
  const modPrefsStr = pref.get("mods", name);
  //trace("modPrefs:", typeof modPrefsStr, String(modPrefsStr), "\n");
  const modPrefs = tryJSON(modPrefsStr) ?? {};
  const allPrefs = { ...hostOpts, ...modOpts, ...modPrefs };
  const modInstance = mod({ name, ...allPrefs, bus });
  if (typeof modInstance == "object" && modInstance) {
    for (const [handlerName, f] of Object.entries(modInstance)) {
      if (typeof f !== "function") continue;
      //trace(`installing hander for ${handlerName} of mod ${name}`);
      bus.on(handlerName, f);
    }
  }
  mods[name] = modInstance;
}

bus.on("*", (topic, payload) =>
  trace(
    `BUS ${new Date().toISOString()} ${topic} ${
      payload ? JSON.stringify(payload) : ""
    }\n`
  )
);

const MQTT_NS = "device1"; //moddable/mqtt/example";

bus.emit("wifista_start");
bus.on("wifista_started", () => {
  bus.emit("network_started");
});

bus.on("wifista_disconnected", () => {
  bus.emit("network_stopped");
});

bus.on("wifiap_started", () => {
  mods["telnet"].start();
  mods["httpserver"].start();
});

bus.on("wifista_unfconfigured", () => {
  bus.emit("wifiap_start");
});

bus.on("network_started", () => {
  bus.emit("mqtt_start");
  //Net.resolve("www.google.com", (m, v) => trace("RESOLVED", m, v, "\n"));
  //mods["telnet"].start();
  bus.emit("telnet_start");
  bus.emit("httpserver_start");
});

bus.on("network_stopped", () => {
  bus.emit("mqtt_stop");
  bus.emit("telnet_stop");
  bus.emit("httpserver_stop");
});

bus.on("mqtt_started", () => {
  bus.emit("mqtt_sub", { topic: `${MQTT_NS}/#` });
  Timer.set(() => {
    bus.emit("mqtt_pub", {
      topic: `${MQTT_NS}/hello`,
      payload: "world",
    });
  }, 100);
});

bus.on("mqtt_message", ({ topic, payload }) => {
  if (topic === `${MQTT_NS}/led`) {
    bus.emit("led_set", { payload: JSON.parse(payload) });
  }
});

bus.on("button_changed", ({ payload }) => {
  bus.emit("mqtt_pub", {
    topic: `${MQTT_NS}/button`,
    payload: String(payload),
  });
  bus.emit("led_set", { payload: !payload });
});

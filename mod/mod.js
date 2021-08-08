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

import { print, getBuildString } from "main";
//import { ResourceIterator } from "ResourceIterator";

print("MOD");
trace(`BOOTING, build: ${getBuildString()}\n`);
trace(`HOST MODULES: ${Modules.host}\n`);
trace(`ARCHIVE MODULES: ${Modules.archive}\n`);
trace(`MOD CONFIG: ${JSON.stringify(modConfig.mods)}\n`);
trace(`RESOURCES: ${[...Resource]}\n`);

let mods = {};
const MOD_PREFIX = "mod-";

class PrefixedBus {
  #prefix;
  constructor(prefix) {
    this.#prefix = prefix;
  }
  on(topic, handler) {
    bus.on(`${this.#prefix}_${topic}`, handler);
  }
  off(topic, handler) {
    bus.off(`${this.#prefix}_${topic}`, handler);
  }
  emit(topic, ...payload) {
    bus.emit(`${this.#prefix}_${topic}`, ...payload);
  }
}

Modules.host
  .concat(Modules.archive)
  .filter((x) => x.startsWith(MOD_PREFIX))
  .forEach((fullName) => {
    trace(`loading ${fullName}\n`);
    let mod = Modules.importNow(fullName);
    let name = fullName.slice(MOD_PREFIX.length);
    if (typeof mod === "function") {
      let bus = new PrefixedBus(name);
      const hostOpts = {}; // TODO : hostConfig.mods[name] || {};
      const modOpts = modConfig.mods[name] || {};
      const modPrefsStr = pref.get("mods", name);
      trace("modPrefs", modPrefsStr);
      const modPrefs = modPrefsStr ? JSON.parse(modPrefsStr) : {};
      const allPrefs = { ...hostOpts, ...modOpts, ...modPrefs };

      mod = mod({ name, ...allPrefs, bus });
    }
    mods[name] = mod;
  });

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

bus.on("network_started", () => {
  bus.emit("mqtt_start");
  mods["telnet"].start();
  mods["httpserver"].start();
  //bus.emit("telnet_start");
});

bus.on("network_stopped", () => {
  bus.emit("mqtt_stop");
  mods["telnet"].stop();
  mods["httpserver"].stop();
  //bus.emit("telnet_start");
});

bus.on("mqtt_started", () => {
  bus.emit("mqtt_sub", { topic: `${MQTT_NS}/#` });
  bus.emit("mqtt_pub", {
    topic: `${MQTT_NS}/hello`,
    payload: "world",
  });
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

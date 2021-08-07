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
import { print, getBuildString } from "main";

trace(`BOOTING, build: ${getBuildString()}\n`);
trace(`HOST MODULES: ${Modules.host}\n`);
trace(`ARCHIVE MODULES: ${Modules.archive}\n`);

print("MOD");

let mods = {};
Modules.host
  .concat(Modules.archive)
  .filter((x) => x.startsWith("mod-"))
  .forEach((plugin) => {
    let mod = Modules.importNow(plugin);
    mods[plugin] = mod;
    trace(`${plugin} is ${typeof mod}\n`);
  });

bus.on("*", (topic, payload) =>
  trace(`BUS ${topic} = ${JSON.stringify(payload)}\n`)
);

const MQTT_NS = "moddable/mqtt/example";

bus.emit("wifista_start");
bus.on("wifista_started", () => {
  bus.emit("mqtt_start");
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

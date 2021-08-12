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
import WiFi from "wifi";

const initialConfig = {
  pref: {},
  telnet: {
    port: 8023,
  },
  httpserver: {
    port: 8080,
  },
  led: {
    pin: 2,
  },
  light: {
    pin: 10,
    mod: "mod-led",
    autostart: true,
  },
  button: {
    pin: 0,
    autostart: true,
  },
  wifista: {
    autostart: true,
  },
  wifiap: {},
  mqtt: {
    id: "device1",
    host: "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
    protocol: "mqtts",
    port: 443,
    certificate: new Resource("certs/aws.iot.der"),
    clientKey: new Resource("certs/device.pk8"),
    clientCertificates: [
      new Resource("certs/device.der"),
      new Resource("certs/rootCA.der"),
    ],
    applicationLayerProtocolNegotiation: ["x-amzn-mqtt-ca"],
    traceSSL: true,
  },
  gui: {},
};

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

//import { getBuildString, getMAC } from "native";

//WiFi.mode = 1;
//trace(`BOOTING, build: ${getBuildString()}\n`);
trace(`MAC NET, ${Net.get("MAC")}\n`);
trace(`IP NET, ${Net.get("IP")}\n`);
//trace(`MAC STA, ${getMAC("sta")}\n`);
//trace(`MAC AP, ${getMAC("ap")}\n`);

trace(`HOST MODULES: ${Modules.host}\n`);
trace(`ARCHIVE MODULES: ${Modules.archive}\n`);
trace(`MOD CONFIG: ${JSON.stringify(modConfig.mods)}\n`);
trace(`RESOURCES: ${[...Resource]}\n`);

let mods = {};

for (let [name, initialSettings] of Object.entries(initialConfig)) {
  try {
    const { module, settings } = loadMod(name, initialSettings);
    mods[name] = instantiateMod(module, settings);
  } catch (e) {
    trace(`Module ${name} not loaded, error: ${e}\n`);
  }
}

function getModPrefs(name) {
  const keys = pref.keys(name);
  let result = {};
  for (const key of keys) {
    result[key] = pref.get(name, key);
  }
  return result;
}

function loadMod(name, settings = {}) {
  const MOD_PREFIX = "mod-";
  const moduleName = settings.mod ?? MOD_PREFIX + name;
  trace(`imporing ${moduleName}\n`);
  const module = Modules.importNow(moduleName);
  const modOpts = modConfig.mods[name] || {};
  const modPrefs = getModPrefs(name);
  const hostOpts = "mods" in hostConfig ? hostConfig.mods[name] : {};
  const allPrefs = { name, ...settings, ...hostOpts, ...modOpts, ...modPrefs };
  return { module, settings: allPrefs };
}

function instantiateMod(mod, settings = {}) {
  const { name } = settings;
  if (typeof mod != "function") {
    trace(`${name} not a module, skipping...\n`);
    return;
  }

  trace(`instantiating ${name} ${JSON.stringify(settings)}\n`);
  let bus = makePrefixedBus(name);
  const modInstance = mod({ ...settings, bus });
  if (typeof modInstance == "object" && modInstance) {
    for (const [handlerName, f] of Object.entries(modInstance)) {
      if (typeof f !== "function") continue;
      trace(`installing hander for ${handlerName} of mod ${name}\n`);
      bus.on(handlerName, f);
    }
  }
  return modInstance;
}

function unloadMod(name) {
  bus.on(`${name}_stopped`, () => {
    trace(`${name} stopped`);
  });
  bus.emit(`${name}_stop`, name);
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
bus.emit("button_start");
bus.emit("led_start");
bus.emit("gui_start");

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
  if (topic === `${MQTT_NS}/kb`) {
    bus.emit("gui_kb", payload);
  }
});

bus.on("button_pressed", () => {
  trace.left("on");
});

bus.on("button_released", () => {
  trace.right("off");
});

bus.on("button_changed", ({ payload }) => {
  bus.emit("mqtt_pub", {
    topic: `${MQTT_NS}/button`,
    payload: String(payload),
  });
  bus.emit("led_set", { payload: !payload });
});

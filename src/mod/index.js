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
import Resource from "Resource";
import Fctry from "Factory";
import Net from "net";
import Timer from "timer";
//import { getBuildString, restart } from "esp32";
import { loadAndInstantiate } from "modLoader";
import { measure } from "profiler";
import getCertSubject from "getCertSubject";
import getBlob from "getBlob";

let deviceId = "sim";

try {
  deviceId = getCertSubject(getBlob("fctry://l/device.der")).CN;
} catch (e) {
  trace("No certificate found, using default deviceId");
}

const initialConfig = {
  measure: {},
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
  sntp: {},
  mqtt: {
    id: deviceId,
    host: "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
    protocol: "mqtts",
    port: 443,
    certificate: "fctry://l/server.der",
    clientKey: "fctry://l/device.pk8",
    clientCertificates: ["fctry://l/device.der", "fctry://l/ca.der"],
    applicationLayerProtocolNegotiation: ["x-amzn-mqtt-ca"],
  },
  ota: {
    url: "http://192.168.0.116:5000/hydrolec-host/xs_esp32.bin",
  },
  gui: {},
};

//WiFi.mode = 1;
//trace("BOOTING, build: ", getBuildString(), "\n");
trace("FW_VERSION:", globalThis.FW_VERSION, "\n");
trace(`MAC NET, ${Net.get("MAC")}\n`);
trace(`IP NET, ${Net.get("IP")}\n`);
//trace(`MAC STA, ${getMAC("sta")}\n`);
//trace(`MAC AP, ${getMAC("ap")}\n`);

trace(`HOST MODULES: ${Modules.host}\n`);
trace(`ARCHIVE MODULES: ${Modules.archive}\n`);
trace(`RESOURCES: ${[...Resource]}\n`);

bus.on("*", (topic, payload) => {
  trace(
    `BUS ${new Date().toISOString()} ${topic} ${
      payload ? JSON.stringify(payload) : ""
    }\n`
  );
});

let mods = {};

for (let [name, initialSettings] of Object.entries(initialConfig)) {
  try {
    mods[name] = loadAndInstantiate(name, initialSettings);
  } catch (e) {
    trace(`Module ${name} not loaded, error: ${e}\n`);
  }
}

const MQTT_NS = deviceId;

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

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", { topic: `${MQTT_NS}/hello` });
  bus.emit("mqtt/sub", { topic: `${MQTT_NS}/led` });
  bus.emit("mqtt/sub", { topic: `${MQTT_NS}/kb` });
  //bus.emit("mqtt/sub", { topic: `${MQTT_NS}/bus` });
  Timer.set(() => {
    bus.emit("mqtt/pub", {
      topic: `${MQTT_NS}/hello`,
      payload: JSON.stringify({ who: "world" }),
    });
  }, 100);
  measure("MQTT Started");

  // bus.on("*", (topic, payload) => {
  //   if (topic.startsWith("mqtt/")) return;
  //   mods["mqtt"].pub({
  //     topic: `${MQTT_NS}/bus`,
  //     payload: JSON.stringify({ topic, payload }),
  //   });
  // });
});

bus.on("mqtt/message", ({ topic, payload }) => {
  if (topic === `${MQTT_NS}/led`) {
    bus.emit("led/set", { payload: JSON.parse(payload) });
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

bus.on("button/changed", ({ payload }) => {
  bus.emit("mqtt/pub", {
    topic: `${MQTT_NS}/button`,
    payload: String(payload),
  });
  bus.emit("led/set", { payload: !payload });
});

bus.on("ota/finished", () => {
  trace("Restarting with new version\n");
  restart();
});

measure("Started");

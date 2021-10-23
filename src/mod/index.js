import Modules from "modules";
import bus from "bus";
import Net from "net";
import Timer from "timer";
import { measure } from "profiler";
import getDefaultDeviceId from "getDefaultDeviceId";
import { getMAC } from "native/esp32";
import pref from "preference";
import BleWiFiServer from "blewifiserver";
import sleep from "sleep";
//this is for side effect
import { loadAndInstantiate } from "modLoader";
import Digital from "embedded:io/digital";
import * as mod_pref from "mod-pref";
import * as mod_mqtt from "mod-mqtt";

if (Modules.has("rc-local")) Modules.importNow("rc-local");
import * as relay from "relay";
import * as kbd from "kbd";
import * as screen from "screen";
import * as engineer from "engineer";

//Modules.importNow("kbd");
//Modules.importNow("screen");

measure("start");

const IS_SIMULATOR = !Modules.has("flash"); //!("device" in globalThis);
const hasModem = !new Digital({ pin: 27, mode: Digital.InputPullUp }).read();

trace("Has modem:", hasModem, "\n");
const led = new Digital({ pin: 23, mode: Digital.Output });
led.write(0); // on

function startHw() {
  if (!IS_SIMULATOR) {
    trace("MAC:", getMAC(), "\n");
    trace("DEVICE ID:", getDefaultDeviceId(), "\n");
  }
}

bus.on("sntp/started", () => {
  bus.emit("start", "mqtt");
});

bus.on("mqtt/started", () => {
  bus.emit("mqtt/sub", "ping");
  bus.emit("mqtt/pub", [
    `hello`,
    JSON.stringify({ ip: Net.get("IP"), hasModem }),
  ]);
});

bus.on("wifista/error", (e) => {
  trace("Wifi STA ERROR:", e, "\n");
  throw e;
});
bus.on("sntp/error", (e) => {
  trace("SNTP ERROR:", e, "\n");
  throw e;
});

bus.on("mqtt/closed", () => {
  trace("MQTT CLOSED\n");
  throw Error("MQTT closed");
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/ping")) {
    bus.emit("mqtt/pub", ["pong", payload]);
  }
});

bus.on("modem/connected", () => {
  trace("IP", Net.get("IP"), "\n");
  trace("DNS", Net.get("DNS"), "\n");
  bus.emit("network/online", { source: "modem" });
});
bus.on("modem/error", (error) => {
  trace("MODEM FAIL\n");
  throw error;
});

bus.on("network/online", ({ source }) => {
  led.write(1);
  bus.emit("start", "telnet");
  Net.resolve("pool.ntp.org", (name, host) => {
    if (!host) {
      trace("Unable to resolve sntp host\n");
      bus.emit("network/offline");
      return;
    }
    trace(`resolved ${name} to ${host}\n`);
    bus.emit("start", "sntp");
  });
});

let bleWiFiServer = null;

function startBleServer() {
  trace("Starting BLE WIFi PROV\n");
  bleWiFiServer = new BleWiFiServer(getDefaultDeviceId(), (ssid, password) => {
    trace("Got Wifi config", ssid, password, "\n");
    bus.emit("stop", "wifista");
    pref.set("wifista", "ssid", ssid);
    pref.set("wifista", "password", password);
    bus.emit("start", "wifista");
  });
}

function stopBleServer() {
  if (!bleWiFiServer) return;
  trace("Stopping BLE");
  bleWiFiServer.disconnect();
  bleWiFiServer.close();
  bleWiFiServer = null;
}

bus.on("wifista/started", () => {
  Timer.set(stopBleServer, 500);
  bus.emit("network/online", { source: "wifista" });
});

bus.on("wifista/unfconfigured", startBleServer);
bus.on("wifista/disconnected", startBleServer);

function simpleStart() {
  startHw();
  bus.emit("start", "pref");
  bus.emit("start", "tz");
  bus.emit("start", "serial");
  //bus.emit("start", "modem");
  //bus.emit("start", "gui");
  //bus.emit("start", "ble");
  if (!hasModem) {
    bus.emit("start", "wifista");
    bus.emit("start", "virtserial");
    Modules.importNow("virtmodem");
  } else {
    //bus.emit("start", "wifista");
    bus.emit("start", "modem");
  }
}

simpleStart();

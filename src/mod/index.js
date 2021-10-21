import Modules from "modules";
import bus from "bus";
import Net from "net";
import Timer from "timer";
import { measure } from "profiler";
import getDefaultDeviceId from "getDefaultDeviceId";
import pref from "preference";
import BleWiFiServer from "blewifiserver";
import sleep from "sleep";
//this is for side effect
import { loadAndInstantiate } from "modLoader";
import Digital from "embedded:io/digital";

if (Modules.has("rc-local")) Modules.importNow("rc-local");

Modules.importNow("kbd");
Modules.importNow("screen");

measure("start");

const IS_SIMULATOR = !Modules.has("flash"); //!("device" in globalThis);
const hasModem = !new Digital({ pin: 32, mode: Digital.InputPullUp }).read();
trace("Has modem:", hasModem, "\n");
const led = new Digital({ pin: 23, mode: Digital.Output });
led.write(1); // on

function startHw() {
  if (!IS_SIMULATOR) {
    trace("DEFAULT DEVICE ID:", getDefaultDeviceId(), "\n");
    Modules.importNow("hardware");
    Modules.importNow("relay");
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

bus.on("network/online", ({ source }) => {
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
  } else {
    //bus.emit("start", "wifista");
    bus.emit("start", "modem");
  }
}

simpleStart();

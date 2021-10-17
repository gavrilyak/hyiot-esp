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
import Digital from "embedded:io/digital";

if (Modules.has("rc-local")) Modules.importNow("rc-local");

measure("start");

const IS_SIMULATOR = !Modules.has("flash"); //!("device" in globalThis);
//trace("BOOTING, build: ", getBuildString(), "\n");
//trace("FW_VERSION:", globalThis.FW_VERSION, "\n");
//trace("HOST MODULES:", Modules.host, "\n");
//trace("ARCHIVE MODULES:", Modules.archive, "\n");
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

bus.on("mqtt/message", ([topic, payload]) => {
  if (topic.endsWith("/ping")) {
    bus.emit("mqtt/pub", ["pong", payload]);
  }
});

bus.on("wifista/started", () => {
  bus.emit("network/online", { source: "wifista" });
});

bus.on("modem/connected", () => {
  trace("IP", Net.get("IP"), "\n");
  trace("DNS", Net.get("DNS"), "\n");
  bus.emit("network/online", { source: "modem" });
});

bus.on("network/online", () => {
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
    Modules.importNow("virtmodem");
  } else {
    //bus.emit("start", "wifista");
    bus.emit("start", "modem");
  }
}

//startAsync();
simpleStart();

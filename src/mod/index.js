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
import Net from "net";
import Timer from "timer";
import { measure } from "profiler";
//this is for side effect
import { loadAndInstantiate } from "modLoader";
measure("start");

const IS_SIMULATOR = !Modules.has("flash"); //!("device" in globalThis);
//trace("BOOTING, build: ", getBuildString(), "\n");
//trace("FW_VERSION:", globalThis.FW_VERSION, "\n");
//trace("HOST MODULES:", Modules.host, "\n");
//trace("ARCHIVE MODULES:", Modules.archive, "\n");
trace("IS_SIMULATOR:", IS_SIMULATOR, "\n");
//trace("GLOBAL:", Object.keys(globalThis), "\n");

//THIS is NECCESSARY for network stack initialization
//import WiFi from "wifi";
//WiFi.mode = 0;

bus.on("*", (payload, topic) => {
  //if(topic.endsWith("/measure") || topic.endsWith("/measured")) return;
  if(topic.endsWith("/read") || topic.endsWith("/write")) return;
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
  //bus.emit("start", "gui");
  //bus.emit("start", "ble");
  bus.emit("start", "virtmodem");//{name: "virtmodem", mod:"serial"});
  bus.emit("start", "serial");
  let startModem = 0;
  let startWifi = 0;
  if (startModem) {
    //bus.emit("start", "modem");
    yield* start("wifiap");
    //yield* start("httpserver");
    //yield* start("telnet");
  } else if (startWifi) {
    bus.emit("start", "wifista");
    let [topic] = yield* once("wifista/started", "wifista/unfconfigured");
    if (topic == "wifista/unfconfigured") {
      yield* start("wifiap");
    } else if (topic == "wifista/started") {
      yield* start("sntp");
      yield* start("mqtt");
    }
    yield* start("telnet");
    yield* start("lineserver");
  }
  //yield* start("wifiap");
  //yield* start("httpserver");
  //yield* start("telnet");
}

import Worker from "worker";
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
    trace("restarting");

    let worker = new Worker("mqtt-worker", {
      allocation: 38 * 1024,
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
        trace("terminating\n");
        worker.terminate();
      }
    } else {
      worker.terminate();
      trace("ERROR starting worker", topic, payload, "\n");
      restart = false;
    }
  }
}

bus.on("modem/connected", () => {
  trace("IP", Net.get("IP"), "\n");
  trace("DNS", Net.get("DNS"), "\n");
  bus.emit("start", "telnet");
  Net.resolve("pool.ntp.org", (name, host) => {
    if (!host) {
      trace("Unable to resolve sntp host\n");
      return;
    }
    trace(`resolved ${name} to ${host}\n`);
    bus.emit("start", "sntp");
  });
});

bus.on("sntp/started", () => {
  //bus.emit("mqtt/start");
});

bus.on("mqtt/started", () => {
  Timer.set(() => {
    bus.emit("mqtt/sub", "hello");
    bus.emit("mqtt/sub", `led`);
    bus.emit("mqtt/sub", `kb`);
    bus.emit("mqtt/sub", `button`);
    bus.emit("mqtt/sub", "$jobs/$next/get/accepted");
    bus.emit("mqtt/sub", "$jobs/notify-next");
  }, 50);
  Timer.set(() => {
    bus.emit("mqtt/pub", [`hello`, JSON.stringify({ who: "world" })]);
    bus.emit("mqtt/pub", ["$jobs/$next/get", "{}"]);
  }, 100);
  bus.on("ble/nason", (payload) => {
    bus.emit("mqtt/pub", ["nason", JSON.stringify(payload)]);
  });
});

let connected = false;

function writeln(str) {
  trace(str, "\r\n");
  bus.emit("virtmodem/write", ArrayBuffer.fromString(str + "\r\n"));
}

const ENABLE_TRAFIC=false;

bus.on("virtmodem/read", (buf) => {
  let arr = new Uint8Array(buf);
  //trace(">>", arr, "\n");
  //trace(">>", JSON.stringify(str), "\n");
  if (arr[0] == 43 && arr[1] == 43 && arr[2] == 43) { // "+++"
    writeln("OK");
  } else if(arr[0] == 65 && (arr[1] == 84 || arr[1] == 212)) { // str.startsWith("AT")) {
    for(let i=0, l=arr.length; i < l; i++) arr[i]&=0x7F; //remove parity bits;
    if(arr[2] == 68 && arr[3] == 84) { //str.startsWith("ATDT")) {
      writeln("CONNECT"); 
      let str = String.fromArrayBuffer(buf.slice(4, -1));
      bus.emit("virtmodem/connected", {num: str.trim()});
    }else if(arr[2] == 72) { //ATH
      bus.emit("virtmodem/disconnected");
      writeln("OK");
    } else {
      writeln("OK");
    }
  }else {
    bus.emit("serial/write", buf);
  }
  if (ENABLE_TRAFIC) traffic(">>", buf);
});


let _arr = new Uint8Array(new ArrayBuffer(512));
function traffic(what, buf) {
  let src = new Uint8Array(buf);
  for(let i=0, l=src.length; i < l; i++) _arr[i] = src[i] & 0x7F;
  _arr[src.length] = 0;
  trace(/*Date.now()%100000, " ",*/ what, " ", String.fromArrayBuffer(_arr.buffer), "\n");
}

bus.on("serial/read", (buf) => {
  //let arr = new Uint8Array(buf);
  //for(let i=0, l=arr.length; i < l; i++) arr[i]&=0x7F;
  //let str = String.fromArrayBuffer(buf);
  //trace("<<", JSON.stringify(str), "\n");
  //trace("<<", arr, "\n");
  bus.emit("virtmodem/write", buf);
  if(ENABLE_TRAFIC) traffic("<<", buf);
});

bus.on("lineserver/read", (packet) => {
  bus.emit("serial/write", packet);
});

const toSend = ArrayBuffer.fromString(":010300006D00018E\n".repeat(10));

bus.on("2serial/started", () => {
  Timer.repeat(() => {
    bus.emit("serial/write", toSend);
  }, 1000);
});

function startAsync() {
  coro(mqttSaga());
  coro(startSequence(), (err, res) => {
    trace("coro", err, res, "\n");
    //bus.emit("mqtt/start");
    //startMQTT();
  });
}

startAsync();

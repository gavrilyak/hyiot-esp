import bus from "bus";

import { parse } from "mblike";

import getDefaultDeviceId from "getDefaultDeviceId";

import {
  setDataBits,
  //setStopBits,
  setParity,
  PARITY_EVEN,
  PARITY_DISABLE,
  DATA_7_BITS,
  DATA_8_BITS,
} from "native/uart";
const port = 2;

function RequestsCache(cache) {
  cache = cache.map((k) => [new Uint8Array(ArrayBuffer.fromString(k)), null]);
  let cacheWaitsIndex = null;

  function read(buf) {
    cacheWaitsIndex = null;
    let bytes = new Uint8Array(buf);
    let matchedIndex = null;
    let cacheIndex, k, v;
    //for (let i = 0, l = bytes.length; i < l; i++) bytes[i] &= 0x7f;
    for (cacheIndex = 0; cacheIndex < cache.length; cacheIndex++) {
      [k, v] = cache[cacheIndex];
      if (bytes.length !== k.length) continue;
      let i = 0;
      let l = bytes.length;
      for (; i < l; i++) if ((bytes[i] & 0x7f) !== k[i]) break;
      if (i === l) break; //found key in cache
    }
    if (cacheIndex < cache.length) {
      //found
      if (v) return v;
      //trace("WAITING FOR CACHE,", cacheIndex, "-", k, "-", bytes, "\n");
      cacheWaitsIndex = cacheIndex;
    }
    //trace("NOT  IN CACHE\n");
    return null;
  }

  function write(payload) {
    if (cacheWaitsIndex == null || payload == null) return;
    trace("Cache store ", cacheWaitsIndex, "\n");
    //store response in cache
    cache[cacheWaitsIndex][1] = payload;
    cacheWaitsIndex == null;
  }

  return {
    read,
    write,
  };
}

const CACHE_PARAMS = [
  //read eeprom - constant
  ":0103000066004056\r\n",
  ":0103000066404016\r\n",
  ":0103000066800412\r\n",
  //write 0E or 0F to command reg, seems redundant
  ":011000006C00020E0073\r\n",
  ":011000006C00020F0072\r\n",
];

let cache = RequestsCache(CACHE_PARAMS);

let remote = null; //getDefaultDeviceId();

const OK_RESPONSE = "OK\r";
const CONNECT_RESPONSE = "CONNECT\r";

const traffic = (() => {
  let _arr = new Uint8Array(new ArrayBuffer(512));
  return (what, buf) => {
    let src = new Uint8Array(buf);
    for (let i = 0, l = src.length; i < l; i++) _arr[i] = src[i] & 0x7f;
    _arr[src.length] = 0;
    trace(what, " ", String.fromArrayBuffer(_arr.buffer));
  };
})();

function handleVirtualModem(buf) {
  let arr = new Uint8Array(buf);
  let emits = [];
  if (arr[0] == 43 && arr[1] == 43 && arr[2] == 43) {
    // "+++"
    emits.push("write", OK_RESPONSE);
  } else if (arr[0] == 65 && (arr[1] == 84 || arr[1] == 212)) {
    // AT or AT&0x80 parity bit
    for (let i = 0, l = arr.length; i < l; i++) arr[i] &= 0x7f; // clear parity bits
    if (arr[2] == 68 && arr[3] == 84) {
      // DT
      emits.push("write", CONNECT_RESPONSE);
      emits.push("connected", {
        num: String.fromArrayBuffer(buf.slice(4, -1)).trim(),
      });
    } else if (arr[2] == 72) {
      // ATH
      emits.push("write", OK_RESPONSE);
      emits.push("disconnected", null);
    } else {
      emits.push("write", OK_RESPONSE);
    }
  }
  return emits.length ? emits : null;
}

bus.on("virtmodem/read", (buf) => {
  let emits = handleVirtualModem(buf);
  if (emits) {
    trace("virtmodem:", new Uint8Array(buf), "=>", JSON.stringify(emits), "\n");
    for (let i = 0; i < emits.length; i += 2) {
      let topic = emits[i];
      let payload = emits[i + 1];
      bus.emit(`virtmodem/${topic}`, payload);
    }
  } else {
    bus.emit("remote/write", buf);
  }
});

bus.on("virtmodem/connected", ({ num }) => {
  remote = num;
  bus.emit("mqtt/sub", `$direct/${remote}/mb<<`);
  cache = RequestsCache(CACHE_PARAMS);
  setParity(port, PARITY_EVEN);
  setDataBits(port, DATA_7_BITS);
});

bus.on("virtmodem/disconnected", () => {
  bus.emit("mqtt/unsub", `$direct/${remote}/mb<<`);
  setParity(port, PARITY_DISABLE);
  setDataBits(port, DATA_8_BITS);
  remote = getDefaultDeviceId();
});

bus.on("remote/write", (payload) => {
  //Timer.set(() => {
  if (remote) {
    let cached = cache.read(payload);
    if (cached) {
      bus.emit("virtmodem/write", cached);
    } else {
      let packet = parse(payload, true);
      //trace(packet.toString(), "\n");
      bus.emit("mqtt/pub", [`$direct/${remote}/mb>>`, packet.toBinary()]);
    }
  }
  //}, 70);
});

bus.on("mqtt/message", ([topic, payload]) => {
  if (!topic.endsWith("/mb<<")) return;
  let packet = parse(payload, false);
  //trace(packet.toString(), "\n");
  let packetAscii = packet.toAscii();
  cache.write(packetAscii);
  //trace(new Uint8Array(packet.toAscii()), "==", new Uint8Array(payload), "\n");
  bus.emit("virtmodem/write", packetAscii); //packet.toAscii());
});

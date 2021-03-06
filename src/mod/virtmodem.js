import bus from "bus";

import { parse, SlaveReadPacket, SlaveWritePacket, toAscii } from "mblike";

function RequestsCache(cache) {
  cache = cache.map((k) => [new Uint8Array(ArrayBuffer.fromString(k)), null]);
  let cacheWaitsIndex = null;

  function read(buf) {
    cacheWaitsIndex = null;
    let bytes = new Uint8Array(buf);
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

let remote = null;
let useBinary = false;

const OK_RESPONSE = "OK\r\n";
const CONNECT_RESPONSE = "CONNECT\r\n";

function handleVirtualModem(buf) {
  let arr = new Uint8Array(buf);
  let emits = [];
  if (arr[0] == 43 && arr[1] == 43 && arr[2] == 43) {
    // "+++"
    emits.push("write", OK_RESPONSE);
    emits.push("config", { extraEOL: 0x0d });
    //emits.push("disconnected", null);
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

const OtherEEPROM = new Uint8Array([
  83, 82, 50, 67, 79, 77, 48, 49, 32, 32, 32, 32, 56, 56, 57, 54, 48, 49, 49,
  55, 1, 0, 2, 0, 0, 0, 0, 4, 0, 1, 0, 0, 50, 52, 54, 50, 48, 48, 54, 54, 57,
  50, 49, 49, 49, 52, 48, 50, 48, 52, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

function processOther(packet) {
  if (packet.cmd == 0x03) {
    if (packet.register == 0xf000)
      return new SlaveReadPacket(packet.register, OtherEEPROM, packet.address);
    return new SlaveReadPacket(
      packet.register,
      new Uint8Array(packet.dataLength),
      packet.address
    );
  } else {
    return new SlaveWritePacket(packet.register, packet.address);
  }
}

bus.on("virtmodem/connected", ({ num }) => {
  remote = num;
  bus.emit("mqtt/sub", `$direct/dev/${remote}/mb/r`);
  cache = RequestsCache(CACHE_PARAMS);
  bus.emit("vserial2/config", { parity: "e", dataBits: 7, extraEOL: 0x0a });
});

bus.on("virtmodem/disconnected", () => {
  bus.emit("mqtt/unsub", `$direct/dev/${remote}/mb/r`);
  bus.emit("vserial2/config", { parity: "n", dataBits: 8, extraEOL: 0x0d });
  remote = null;
});

bus.on("virtmodem/write", (p) => bus.emit("vserial2/write", p));
bus.on("virtmodem/config", (p) => bus.emit("vserial2/config", p));

bus.on("vserial2/read", (payload) => {
  let emits = handleVirtualModem(payload);
  if (emits) {
    trace(
      "virtmodem:",
      new Uint8Array(payload),
      "=>",
      JSON.stringify(emits),
      "\n"
    );
    for (let i = 0; i < emits.length; i += 2) {
      let topic = emits[i];
      let payload = emits[i + 1];
      bus.emit(`virtmodem/${topic}`, payload);
    }
  } else {
    let cached = cache.read(payload);
    if (cached) {
      //trace("C");
      bus.emit("vserial2/write", cached);
      return;
    }

    let packet = null;
    try {
      packet = parse(payload, true);
    } catch (e) {
      trace("UNABLE TO PARSE packet from Soft:", e.message, "\n");
      trace("PACKET:", new Uint8Array(payload), "\n");
      return;
    }

    if (packet.address != 1) {
      trace("O", packet.toString(), "\n");
      bus.emit("vserial2/write", processOther(packet).toAscii());
      return;
    }

    if (!remote) {
      trace("NO REMOTE WHEN WRITING PACKET!", packet.toString(), "\n");
      return;
    }

    bus.emit("mqtt/pub", [
      `$direct/dev/${remote}/mb/w`,
      useBinary ? packet.toBinary() : payload,
    ]);
  }
});

function writeToRemote(payload) {}

bus.on("mqtt/message", ([topic, payload]) => {
  if (!topic.endsWith("/mb/r")) return;
  let packetAscii = toAscii(payload);

  if (!useBinary && packetAscii !== payload) {
    trace("Switching to binary\n");
    useBinary = true;
  }

  cache.write(packetAscii);
  bus.emit("vserial2/write", packetAscii);
});

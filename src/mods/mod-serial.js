import Timer from "timer";
import BinaryBuffer from "BinaryBuffer";
import {
  setDataBits,
  //setStopBits,
  setParity,
  PARITY_EVEN,
  DATA_7_BITS,
  DATA_8_BITS,
  setRxFullThreshold,
  setTxEmptyThreshold,
  PARITY_DISABLE,
} from "native/uart";

export default function ({
  bus,
  rx = 16,
  tx = 17,
  port = 2,
  baud = 115200,
  dataBits = 8,
  parity = "n",
  stopBits = 1,
  readLines = true,
  extraEOL = 0x0a,
  rxThreshold = 70,
}) {
  //let trace = () => {};

  let serial = null;
  let buffer = new BinaryBuffer(30);
  let writebleCount = 0;
  let chunksRead = [];

  function emitChunks() {
    let chunkLength = chunksRead.length;
    if (chunkLength == 0) return;
    let firstChunk = chunksRead[0];
    let res =
      chunkLength == 1 ? firstChunk : firstChunk.concat(...chunksRead.slice(1));
    chunksRead.length = 0;
    trace("=", res.byteLength, "\n");
    bus.emit("read", res);
  }

  function checkPacket() {
    let chunkLength = chunksRead.length;
    if (chunkLength == 0) return;

    let arr = new Uint8Array(chunksRead[chunkLength - 1]);
    let last = arr[arr.length - 1];
    // ends with \r \n or startsWith +++
    if (last == 0x0a || last == extraEOL || (last & 0x7f) == extraEOL)
      emitChunks();
  }

  function onReadable(cnt = 0) {
    let more = cnt < rxThreshold ? 0 : 1;
    let buf = serial.read(cnt - more);
    trace(buf.byteLength, ",");
    if (!readLines) {
      bus.emit("read", buf);
      return;
    }

    let arr = new Uint8Array(buf);
    if (arr[0] == 43 && arr[1] == 43 && arr[2] == 43) {
      emitChunks();
      bus.emit("read", buf);
      return;
    }

    chunksRead.push(buf);
    //Timer.set(onReadable, 0);
    checkPacket();
  }

  function onWritable(count) {
    writebleCount = count;
    //trace("serial", port, " writable ", count, "\n");
    doWrite();
  }

  function doWrite() {
    if (writebleCount === 0) {
      //trace(port, "WF!\n");
      return;
    }
    let chunk = buffer.read(writebleCount);
    if (chunk) {
      //trace(port, "W:", chunk.byteLength, "A:", writebleCount, "\n");
      writebleCount -= chunk.byteLength;
      serial.write(chunk);
    }
  }

  function start() {
    //trace("Starting serial ", port, "\n");
    serial = new device.io.Serial({
      ...device.Serial.default,
      baud,
      port,
      receive: rx,
      transmit: tx,
      format: "buffer",
      onReadable,
      onWritable,
    });
    //empty out rx buff

    config({ parity, dataBits });
    setRxFullThreshold(port, rxThreshold);
    setTxEmptyThreshold(port, 4);
    //if (parity == "e") setParity(port, PARITY_EVEN);
    //if (dataBits == 7) setDataBits(port, DATA_7_BITS);

    serial.read();
    bus.emit("started"); // ??? , {rx, tx, port, mode: `${baud}-${dataBits}-${parity}-${stopBits}`});
    return;
  }

  function write(packet) {
    //serial.write(packet);
    if (typeof packet == "string") packet = ArrayBuffer.fromString(packet);
    buffer.write(packet);
    doWrite();
    //let arr = new Uint8Array(packet);
    //trace("serial>> ", arr, "\n");
  }

  function stop() {
    if (serial) {
      serial.close();
      serial = null;
    }
  }

  function config(cfg = {}) {
    if ("parity" in cfg) {
      trace("PARITY", cfg.parity, "\n");
      if (cfg.parity == "e") setParity(port, PARITY_EVEN);
      else if (cfg.parity == "n") setParity(port, PARITY_DISABLE);
    }
    if ("dataBits" in cfg) {
      trace("DATabits", cfg.dataBits, "\n");
      if (cfg.dataBits == 7) setDataBits(port, DATA_7_BITS);
      else if (cfg.dataBits == 8) setDataBits(port, DATA_8_BITS);
    }
    if ("extraEOL" in cfg) {
      trace("extraEOL", cfg.extraEOL, "\n");
      extraEOL = cfg.extraEOL;
    }
  }

  return {
    start,
    stop,
    write,
    config,
  };
}

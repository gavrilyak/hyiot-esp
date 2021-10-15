import Timer from "timer";
import BinaryBuffer from "BinaryBuffer";
import {
  setDataBits,
  //setStopBits,
  setParity,
  PARITY_EVEN,
  DATA_7_BITS,
  setRxFullThreshold,
  setTxEmptyThreshold,
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
    trace(cnt > 0 ? "!" : ">");
    let buf = serial.read();
    if (!buf) {
      checkPacket();
      return;
    }
    //trace("serial", port, " read:", buf.byteLength, "\n");
    trace(buf.byteLength);
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
    Timer.set(onReadable, 0);
  }

  function onWritable(count) {
    writebleCount = count;
    //trace("serial", port, " writable ", count, "\n");
    doWrite();
  }

  function doWrite() {
    if (writebleCount === 0) {
      //trace("serial", port, " cannot write, full\n");
      return;
    }
    let chunk = buffer.read(writebleCount);
    if (chunk) {
      //trace( "serial", port, " writing:", chunk.byteLength, "avail:", writebleCount, "\n");
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
    serial.read();

    if (parity == "e") setParity(port, PARITY_EVEN);
    if (dataBits == 7) setDataBits(port, DATA_7_BITS);
    setRxFullThreshold(port, 40);
    setTxEmptyThreshold(port, 4);

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

  return {
    start,
    stop,
    write,
  };
}

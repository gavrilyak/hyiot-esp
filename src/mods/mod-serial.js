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

  function onReadable() {
    for (;;) {
      let buf = serial.read();
      if (!buf || buf.byteLength == 0) break;
      if (!readLines) {
        bus.emit("read", buf);
      } else {
        chunksRead.push(buf);
      }
    }
    if (!readLines) return;
    // ends with \r \n or startsWith +++
    let chunksCount = chunksRead.length;
    if (chunksCount == 0) return;
    let arr = new Uint8Array(chunksRead[chunksCount - 1]);
    let last = arr[arr.length - 1];
    if (
      last == 0x0a ||
      last == extraEOL ||
      (arr[0] == 43 && arr[1] == 43 && arr[2] == 43)
    ) {
      let firstChunk = chunksRead[0];
      let res =
        chunksCount == 1
          ? firstChunk
          : firstChunk.concat(...chunksRead.slice(1));
      chunksRead.length = 0;
      bus.emit("read", res);
    }
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
    setRxFullThreshold(port, 64);
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

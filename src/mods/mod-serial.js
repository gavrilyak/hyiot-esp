import Timer from "timer";
import BinaryBuffer from "BinaryBuffer";
import {
  setDataBits,
  //setStopBits,
  setParity,
  PARITY_EVEN,
  DATA_7_BITS,
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
}) {
  let serial = null;
  let buffer = new BinaryBuffer(30);
  let writebleCount = 0;

  function onReadable(cnt) {
    let buf = serial.read(cnt);
    trace("serial read", cnt, " ", buf.byteLength, "\n");
    //bus.emit("read", buf);
  }

  function onWritable(count) {
    writebleCount = count;
    doWrite();
    trace("serial writable ", count, "\n");
  }

  function doWrite() {
    if (writebleCount === 0) return;
    let chunk = buffer.read(writebleCount);
    if (chunk) {
      trace("Writing:", chunk.byteLength, "avail:", writebleCount, "\n");
      writebleCount -= chunk.byteLength;
      serial.write(chunk);
    } else {
      trace("Nothing to write???\n");
    }
  }

  function start() {
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

    if (parity == "e") setParity(port, PARITY_EVEN);
    if (dataBits == 7) setDataBits(port, DATA_7_BITS);
    bus.emit("started"); // ??? , {rx, tx, port, mode: `${baud}-${dataBits}-${parity}-${stopBits}`});
    return;
  }

  function write(packet) {
    //serial.write(packet);
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

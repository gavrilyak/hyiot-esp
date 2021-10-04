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
  readLines = true
}) {
  let trace = () => {}

  let serial = null;
  let buffer = new BinaryBuffer(30);
  let writebleCount = 0;
  let chunksRead = [];

  function onReadable(cnt) {
    let buf = serial.read(cnt);
    trace("serial", port, " read", cnt, " ", buf.byteLength, "\n");
    if(!readLines) {
      bus.emit("read", buf);
    }else {
      chunksRead.push(buf); 
      {
	let arr = new Uint8Array(buf);
	let lastChar =  arr[arr.length - 1];
	if(lastChar == 0x0D || lastChar == 0x0A) {
	  let firstChunk = chunksRead[0];
	  let res = (chunksRead.length == 1) ? firstChunk :
	    firstChunk.concat(...chunksRead.slice(1));
	  chunksRead.length = 0;
	  bus.emit("read", res);
	}
      }
    }
  }

  function onWritable(count) {
    writebleCount = count;
    trace("serial", port, " writable ", count, "\n");
    doWrite();
  }

  function doWrite() {
    if (writebleCount === 0) {
      trace("serial", port, " cannot write, full\n");
      return;
    }
    let chunk = buffer.read(writebleCount);
    if (chunk) {
      trace("serial", port, " writing:", chunk.byteLength, "avail:", writebleCount, "\n");
      writebleCount -= chunk.byteLength;
      serial.write(chunk);
    }
  }

  function start() {
    trace("Starting serial ", port, "\n");
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

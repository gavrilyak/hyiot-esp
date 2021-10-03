import Timer from "timer";
import coro from "coro";
import sleep from "sleep";

import {setDataBits, setStopBits, setParity, PARITY_EVEN, DATA_7_BITS} from "native/uart";

export default function ({ bus, rx=16, tx=17, port=2, baud=115200, dataBits=8, parity="n", stopBits=1}) {
  let serial = null;

  function onReadable(cnt) {
    let buf = serial.read(cnt);
    trace("serial read", cnt, " ", buf.byteLength, "\n");
    bus.emit("read", buf);
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
      //onWritable
    });

    if(parity == "e") setStopBits(port, PARITY_EVEN);
    if(dataBits == 7) setDataBits(port, DATA_7_BITS);
    bus.emit("started") // ??? , {rx, tx, port, mode: `${baud}-${dataBits}-${parity}-${stopBits}`});
    return;
    coro(loop(), (err, res) => {
      if (!err) {
        bus.emit("finished", res);
      } else {
        bus.emit("error", err.message);
        stop();
      }
    });
  }

  function write(packet) {
    serial.write(packet);
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
    write
  };
}

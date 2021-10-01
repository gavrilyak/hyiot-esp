import Timer from "timer";
import coro from "coro";
import sleep from "sleep";

import {setDataBits, setStopBits, setParity, PARITY_EVEN, DATA_7_BITS} from "native/uart";

export default function ({ bus, rx=16, tx=17, port=2, baud=115200, dataBits=8, parity="n", stopBits=1}) {
  let serial = null;

  function* readBin(timeout = 1000) {
    let st = Date.now();
    let resps = [];
    do {
      let resp = serial.read();
      if (resp) {
        resps.push(resp);
      } else {
        yield* sleep(5);
      }
    } while (Date.now() - st < timeout);
    if (!resps.length) return null;
    let resp = resps[0].concat(...resps.slice(1));
    return resp;
  }

  function* loop() {
    for (;;) {
      const packet = yield* readBin(30000);
      if(packet) {
        bus.emit("read", packet);
      } else {
        bus.emit("timeout")
      }
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
    });

    if(parity == "e") setStopBits(port, PARITY_EVEN);
    if(dataBits == 7) setDataBits(port, DATA_7_BITS);
    bus.emit("started") // ??? , {rx, tx, port, mode: `${baud}-${dataBits}-${parity}-${stopBits}`});
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
    let arr = new Uint8Array(packet.buffer);
    if(dataBits == 7) for (let i=0, l=arr.length; i<l; i++) arr[i] &= 0x7F;
    serial.write(packet);
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

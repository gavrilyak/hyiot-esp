import Timer from "timer";
import coro from "coro";
import sleep from "sleep";


export default function ({ bus }) {
  let serial = null;

  function* readBin(timeout = 1000) {
    let st = Date.now();
    let resps = [];
    do {
      let resp = serial.read();
      if (resp) {
        trace(new Uint8Array(resp), "\n");
        resps.push(resp);
      } else {
        yield* sleep(5);
      }
    } while (Date.now() - st < timeout);
    if (!resps.length) return null;
    let resp = resps[0].concat(...resps.slice(1));
    return resp;
  }

  function* readString(timeout = 100) {
    let resp = yield* readBin(timeout);
    if(!resp) return resp;
    if (new Uint8Array(resp).find((x) => x > 127) >= 0) {
      trace("Not valid ascii string\n");
      return "ERROR";
    }
    let res = String.fromArrayBuffer(resp);
    return res;
  }

  function writeln(serial, str) {
    return serial.write(ArrayBuffer.fromString(str + "\r\n"));
  }

  function* loop() {
    for (;;) {
      bus.emit("starting");
      serial = new device.io.Serial({
        ...device.Serial.default,
        baud: 115200,
        port: 1,
        receive: 18,
        transmit: 19,
        format: "buffer",
      });

      for(;;) {
        //bus.emit("rd");
        let str = yield* readString(30000);
        if(str) {
          trace("<<", str, "\n");
          if(str.startsWith("ATD")) {
            trace(">>CONNECT\n");
            writeln("CONNECT"); 
            break; //we are looped
          } else if (str == "ERROR") {
            trace(">>ERROR\n");
            writeln("ERROR")
          }else {
            trace(">>OK\n");
            writeln("OK")
          }
        } else {
	  bus.emit("nothing")
	}
      }

      for(;;) {
        let bin = yield* readBin(10000);
        if(!bin) {
           trace("Timeout receiving packet\n");
           //TODO: drop DCD
           break;
        } else if (packet[0] == 0x23 && packet[1] == 0x23 && packet[2] == 0x23) { // "+++"
          trace("+++ received\n")
          break;
        } 

        bus.emit("read", new Uint8Array(bin));
        /*
        let arr = new Uint8Array(bin);
        if (arr[0] == 0x3a && arr[arr.length-1] == 0x0a) {
          for (let i=0, l=arr.length; i<l; i++) {
             arr[i] = arr[i] & 0x7F;
          }
          trace("PACKET", String.fromArrayBuffer(arr.buffer), "\n");
        }
       */
      }
    }
  }

  function start() {
    coro(loop(), (err, res) => {
      if (!err) {
        bus.emit("started", res);
      } else {
        bus.emit("error", err.message);
        stop();
      }
    });
  }

  function write(packet) {
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

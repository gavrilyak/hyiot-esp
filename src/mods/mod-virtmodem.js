import Timer from "timer";
import coro from "coro";
import sleep from "sleep";

export default function ({ bus }) {
  let serial = null;
  
  function* readString(timeout = 100) {
    //yield* sleep(timeout);
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
    try {
      if (new Uint8Array(resp).find((x) => x > 127) >= 0) {
        trace("Not valid ascii string\n");
        return "ERROR";
      }
      let res = String.fromArrayBuffer(resp);
      return res;
    } catch (e) {
      //It MUST be string, what else
      return null;
    }
  }

  function writeln(str) {
    return serial.write(ArrayBuffer.fromString(str + "\r\n"));
  }

  function* send(cmd, timeout = 30) {
    writeln(cmd);
    const res = yield* readString(timeout);
    return res;
  }

  function* connect() {
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
	let str = yield* readString();
	if(str) {
	  bus.emit("rx", str);
          if(str === "ERROR") {
	    writeln("ERROR")
          } else if(str.startsWith("ATD")) {
	    trace("CONNECT\n");
	    writeln("CONNECT"); 
          } else {
	    trace("OK\n");
            writeln("OK")
	  }
	}
        yield* sleep(300);
      }
    }
  }

  function start() {
    coro(connect(), (err, res) => {
      if (!err) {
        bus.emit("started", res);
      } else {
        bus.emit("error", err.message);
        stop();
      }
    });
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
  };
}

import Timer from "timer";
import coro from "coro";
import sleep from "sleep";


export default function ({ bus }) {
  let serial = null;
  let readableCB = null;
  let connected = false;
  function onReadable(count) {
    //if (readableCB) { readableCB(null, count); }
    let buf = serial.read(count);
    let arr = new Uint8Array(buf);
    for(let i=0, l=arr.length; i < l; i++) arr[i]&=0x7F;
    trace("onReadable ", count, " ",arr.length, "->", arr[arr.length - 1] == 0x0a, "\n");
    if (arr[0] == 43 && arr[1] == 43 && arr[2] == 43) { // "+++"
      trace("+++ received\n")
      connected = false;
    } 
    if(!connected) {
      let str = String.fromArrayBuffer(buf);
          if(str.startsWith("ATD")) {
            writeln("CONNECT"); 
            connected = true;
            bus.emit("connected");
          } else if (str == "ERROR") {
            writeln("ERROR")
          }else {
            writeln("OK")
          }
    }else{
      bus.emit("read", buf);
    }
  }

  function* waitRead(timeout) {
    let cont = yield coro;
    readableCB = cont;
    return yield;
  }

  function* readBin3(timeout = 30) {
    let st = Date.now();
    let resps = [];
    do {
      let resp = serial.read();
      if (resp) {
        resps.push(resp);
        let arr = new Uint8Array(resp);
        trace("V readBin:", arr, "\n");
        let last = arr[arr.length - 1];
        if(last == 10 || last == 13) break;
      } else {
        if(resps.length) break;
        yield* sleep(5);
      }
    } while (Date.now() - st < timeout);
    if (!resps.length) return null;
    let resp = resps[0].concat(...resps.slice(1));
    return resp && new Uint8Array(resp);
  }

  function* readBin(timeout) {
    let resps = [];
    let resp = serial.read(); 
    if(!resp) {
      yield *waitRead(timeout);
      resp = serial.read();
      if(!resp) return null;
    }
    resps.push(resp)
    for(;;) {
      resp = serial.read();
      if(!resp) break;
      resps.push(resp);
    }
    if (!resps.length) return null;
    let res = resps[0].concat(...resps.slice(1));
    return res && new Uint8Array(res);
  }

  function* readString(timeout = 30) {
    let resp = yield* readBin(timeout);
    if(!resp) return resp;
    for(let i=0, l=resp.length; i < l; i++) resp[i]&=0x7F;
    if (resp.find((x) => x > 127) >= 0) {
      trace("Not valid ascii string\n");
      return "ERROR";
    }
    let res = String.fromArrayBuffer(resp.buffer);
    return res;
  }

  function writeln(str) {
    trace(str, "\n");
    return serial.write(ArrayBuffer.fromString(str + "\r\n"));
  }

  function* loop() {
    bus.emit("started");
    for (;;) {
      for(;;) {
        //bus.emit("rd");
        let str = yield* readString(12000);
        if(str) {
          trace("<<", str, "\n");
          if(str.startsWith("ATD")) {
            writeln("CONNECT"); 
            trace(">>CONNECT\n");
            bus.emit("connected");
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
	let buf = serial.read(32);
	while(!buf) {
	  trace("Waiting...\n");
	  let len = yield* waitRead();
	  trace("Wait done ", len, "\n");
	  buf = serial.read(32);
	}
	let packet = new Uint8Array(buf);
	trace("Got packet ", packet.length, "\n");
	if (packet[0] == 43 && packet[1] == 43 && packet[2] == 43) { // "+++"
	  trace("+++ received\n")
	  break;
	} 
	bus.emit("read", packet.buffer);
      }
      bus.emit("disconnected");
    }
  }

  function start() {
    serial = new device.io.Serial({
      ...device.Serial.default,
      baud: 115200,
      port: 1,
      receive: 18,
      transmit: 19,
      format: "buffer",
      onReadable
    });
    return;

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

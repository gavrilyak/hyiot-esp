import CLI from "cli";
import Timer from "timer";
import coro from "coro";
import sleep from "sleep";
import * as pppos from "pppos";

export default function ({ bus }) {
  let serial = null;
  let cli;
  const pwrKey = new device.io.Digital({
    pin: 14,
    mode: device.io.Digital.Output,
  });

  function* pressButton() {
    trace("powerOn\n");
    pwrKey.write(1);
    yield* sleep(1100);
    pwrKey.write(0);
    yield* sleep(10000);
    trace("powerOn done\n");
  }

  CLI.install(function (command, ...opts) {
    if (typeof command === "string" && command.toUpperCase().startsWith("AT")) {
      cli = this;
      serial.write(ArrayBuffer.fromString(command + "\r\n"));
      coro(readString(), (e, r) => {
        if (r) cli.line(r);
      });
      return true;
    }
    return false;
  });

  function* readString(timeout = 100) {
    //yield* sleep(timeout);
    let st = Date.now();
    let resps = []; 
    do{
      let resp = serial.read();
      if(resp) {
	      resps.push(resp)
      } else {
	      yield *sleep(5);
      }
    }while(Date.now() - st < timeout);
    if (!resps.length) return null;
    let resp = resps[0].concat(...resps.slice(1))
    try {
      if (new Uint8Array(resp).find((x) => x > 127) >= 0) {
        trace("Not valid ascii string\n");
        return null;
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

  function* findModem() {
    for (let i = 0; i < 4; i++) {
      yield* pressButton();
      for (let i = 0; i < 7; i++) {
        writeln("AT");
        let res = yield* readString(200);
        if (!res) continue;
        if (res.includes("ERROR")) continue;
        if (res.includes("OK")) return res;
      }
    }
    return null;
  }

  function* send(cmd, timeout = 20) {
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
        //baud: 9600,
        port: 2,
        receive: 16,
        transmit: 17,
        format: "buffer",
      });
      let found = yield* findModem();
      if (!found) {
        trace("Modem not found\n");
        bus.emit("error", "modem not found");
        serial.close();
        yield* sleep(20000);
        continue;
      }
      trace("Modem found\n");
      trace("SMNB", JSON.stringify(yield* send("AT+CMNB=1")), "\n");
      //for(;;){
      trace("CPIN", JSON.stringify(yield* send("AT+CPIN?")), "\n");
      trace("CSQ", JSON.stringify(yield* send("AT+CSQ")), "\n");
      trace("COPS", JSON.stringify(yield* send("AT+COPS?")), "\n");
      trace("CPSI", JSON.stringify(yield* send("AT+CPSI?")), "\n");
      trace("CREG", JSON.stringify(yield* send("AT+CREG?")), "\n"); 
      trace("CBANDCFG", JSON.stringify(yield* send("AT+CBANDCFG?")), "\n"); 
	      yield* sleep(2000);
      //}
	    return;
      trace(
        "CGDCONT",
        JSON.stringify(yield* send('AT+CGDCONT=1,"IP","hologram"')),
        "\n"
      );
      trace("ATD", JSON.stringify(yield* send("ATD*99#")), "\n");;
      serial.close();

      const cont = yield coro;
      let msg;
      pppos.start((msg) => cont(null, msg));
      for (;;) {
        msg = yield;
        trace("PPPOS MSG:", msg, "\n");
        if (msg != pppos.PPPERR_NONE) break;
        if (msg == 0) bus.emit("connected");
      }
      pppos.stop();
      bus.emit("stopped", { msg });
      yield* sleep(5000);
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

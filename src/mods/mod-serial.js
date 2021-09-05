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
    yield* sleep(5000);
    trace("powerOn done\n");
  }

  CLI.install(function (command, ...opts) {
    if (typeof command === "string" && command.toUpperCase().startsWith("AT")) {
      cli = this;
      serial.write(ArrayBuffer.fromString(command + "\r\n"));
      return true;
    }
    return false;
  });

  function* read(timeout = 100) {
    trace("READ", timeout, "\n");
    yield* sleep(timeout);
    let resp = serial.read();
    if (!resp) return null;
    let str = String.fromArrayBuffer(resp);
    trace("RESP", str, "\n");
    return str;
  }

  function writeln(str) {
    trace("WRITE", str, "\n");
    return serial.write(ArrayBuffer.fromString(str + "\r\n"));
  }

  function* findModem() {
    for (let i = 0; i < 4; i++) {
      yield* pressButton();
      for (let i = 0; i < 7; i++) {
        writeln("ATZ");
        let res = yield* read(200);
        if (!res) continue;
        if (res.includes("ERROR")) continue;
        if (res.includes("OK")) return res;
      }
    }
    throw Error("No modem found");
  }

  function* send(cmd, timeout = 100) {
    let written = writeln(cmd);
    trace("WRITTEN:", written, " of ", cmd.length + 2);
    const res = yield* read(timeout);
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
      trace("serial created\n");
      yield* findModem();
      //let cpinRes = yield* send("AT+CPIN?");
      //trace("CPIN", JSON.stringify(cpinRes), "\n");
      //let csqResp = yield* send("AT+CSQ");
      //trace("CSQ", JSON.stringify(csqResp), "\n");
      trace(yield* send('AT+CGDCONT=1,"IP","hologram"'), "\n");
      trace(yield* send("ATD*99#"), "\n");
      serial.close();
      serial = null;
      const cont = yield coro;
      pppos.start((msg) => cont(null, msg));
      let msg;
      for (;;) {
        msg = yield;
        trace("PPPOS MSG:", msg, "\n");
        //if (msg != pppos.PPPERR_NONE)
        break;
      }
      pppos.stop();
      bus.emit("stopped", { msg });
      yield* sleep(100);
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

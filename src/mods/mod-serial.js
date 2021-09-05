import CLI from "cli";
import Timer from "timer";
import coro from "coro";
import sleep from "sleep";

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

  let resps = [];
  let readableCB = null;

  function onReadable(count) {
    trace("Readable,", count);
    resps = [];
    let resp;
    while ((resp = this.read())) {
      //trace("resp", resp.byteLength, "\n");
      trace(String.fromArrayBuffer(resp));
      resps.push(resp);
    }
    trace("\n");
    if (cli)
      cli.line(resps.map((resp) => String.fromArrayBuffer(resp)).join(""));
    if (readableCB) readableCB(null, resps);
  }

  function* read(timeout = 100) {
    trace("READ", timeout, "\n");
    if (resps.length == 0) {
      let cont = yield coro;
      readableCB = cont;
      let timer = Timer.set(() => {
        cont(null, "TIMEOUT");
      }, timeout);
      let res = yield;
      readableCB = null;
      if (res === "TIMEOUT") {
        trace("TIMEOUT\n");
        return null;
      } else {
        Timer.clear(timer);
      }
    }

    let str = resps
      .map((resp) => String.fromArrayBuffer(resp))
      .join("")
      .trim();
    trace("MODEM RESP", JSON.stringify(str), "\n");
    let res = str.split("\r\n");
    resps = [];
    return res;
  }

  function writeln(str) {
    trace("WRITE", str, "\n");
    return serial.write(ArrayBuffer.fromString(str + "\r\n"));
  }

  function* findModem() {
    for (let i = 0; i < 4; i++) {
      for (let i = 0; i < 7; i++) {
        writeln("ATZ");
        let res = yield* read(500);
        if (!res) continue;

        let [cmd, ok] = res;
        trace("got something:", cmd, ok === "OK", "\n");
        if (cmd.trim() !== "ATZ" || ok !== "OK") break;
        return res;
      }
      yield* pressButton();
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
    yield* findModem();
    let cpinRes = yield* send("AT+CPIN?");
    trace("CPIN", JSON.stringify(cpinRes), "\n");
    let csqResp = yield* send("AT+CSQ");
    trace("CSQ", JSON.stringify(csqResp), "\n");
  }

  function start() {
    serial = new device.io.Serial({
      ...device.Serial.default,
      baud: 115200,
      //baud: 9600,
      port: 2,
      receive: 16,
      transmit: 17,
      format: "buffer",
      onReadable,
    });
    coro(connect(), (err, res) => {
      if (!err) bus.emit("started", res);
      else {
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

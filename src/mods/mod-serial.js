let msgs = ["AT", "AT", "AT", "ATZ", "AT&V"];
import CLI from "cli";

export default function ({ bus }) {
  let serial = null;
  let cli;

  CLI.install(function (command, ...opts) {
    if (typeof command === "string" && command.toUpperCase().startsWith("AT")) {
      serial.write(
        ArrayBuffer.fromString([command, ...opts].join(" ") + "\r\n")
      );
      cli = this;
      return true;
    }
    return false;
  });

  function start() {
    serial = new device.io.Serial({
      ...device.Serial.default,
      baud: 115200,
      //baud: 9600,
      port: 2,
      receive: 16,
      transmit: 17,
      format: "buffer",
      onReadable: function (count) {
        trace("Readable,", count);
        let resps = [];
        let resp;
        while ((resp = this.read())) {
          trace("resp", resp.byteLength, "\n");
          //trace("resp", String.fromArrayBuffer(resp), new Uint8Array(resp), "\n");
          resps.push(resp);
        }
        let wholeResp = resps
          .map((resp) => String.fromArrayBuffer(resp))
          .join("");
        if (cli) cli.line(wholeResp);
        trace(wholeResp);
      },
    });
    bus.emit("started");
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

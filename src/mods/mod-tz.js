//import { setenv, tzset } from "esp32";
import Resource from "Resource";

function findTZ(name, bin) {
  const C_BIN = 0x0a;
  const K_BIN = 0x20;
  //const V_BIN = 0x3d;

  const [cont, city] = name.split("/");
  let pos = 0;
  let binLen = bin.length;
  let cityLen = city.length;
  outer: while (pos < binLen) {
    pos = bin.indexOf(C_BIN, pos);
    if (
      bin[++pos] == cont.charCodeAt(0) &&
      bin[++pos] == cont.charCodeAt(1) &&
      bin[++pos] == cont.charCodeAt(2)
    ) {
      for (;;) {
        pos = bin.indexOf(K_BIN, pos);
        let first = bin[++pos];
        if (first === C_BIN) break outer;
        if (first === city.charCodeAt(0)) {
          let i;
          for (i = 1; ; i++) {
            let c = bin[++pos];
            if (c != city.charCodeAt(i)) break;
          }
          if (i === cityLen) {
            pos++;
            return String.fromArrayBuffer(
              bin.slice(pos, bin.indexOf(K_BIN, pos)).buffer
            );
          }
        }
      }
    }
    ++pos;
  }
  return null;
}
export default function ({ bus, tz }) {
  function start() {
    if (!tz) {
      bus.emit("error", "Empty timezone");
      return;
    }
    let zonesDb = new Resource("zones.dat");
    let b = new Uint8Array(zonesDb);
    let posix = findTZ(tz, b);
    if (!posix) {
      bus.emit("error", "Unsupported timezone");
      return;
    }
    // setenv("TZ", posix, 1);
    // tzset();
    let d = new Date();
    let now = d.toString();
    let utc = d.toUTCString();
    bus.emit("started", { tz, posix, utc, now });
  }

  function stop() {
    bus.emit("stopped");
  }

  return {
    start,
    stop,
  };
}

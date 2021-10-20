import bus from "bus";
import Timer from "timer";
import { MasterReadPacket } from "mblike";

const POLL_INTERVAL = 1000;

//clock on green screen - 3rd line, symbols 11,12 14,15
//      on blue  screen - last 5 symbols on last line

const SCAN_LEN = 18 * 4 - 5; /*clock*/
function isScreenChanged(prev, curr) {
  let empty = true;
  let changed = false;
  for (let i = 0; i < SCAN_LEN; i++) {
    let val = curr[i];
    if (val != 0x20) empty = false;
    if (val == 0x1f) continue; //ignore menu cursor
    if (val == 0xda) continue; //ignore cursor
    if (val == 0x20) continue; //ignore space
    if (curr[i] != prev[i]) changed = true;
  }
  //console.log({ empty, changed });
  return !empty && changed;
}

let prevScreen = new Uint8Array(72).fill(0x20);

bus.on("relay/read", (packet) => {
  //trace("RD", packet, "\n");
  if (!packet || packet.cmd != 0x03 || packet.dataLength != 0x4e) return;
  if (!isScreenChanged(prevScreen, packet.data)) return;
  prevScreen = packet.data;
  bus.emit("mqtt/pub", ["scr", packet.data.slice(0, 72).buffer, true]);
});

//screen
const READ_SCREEN = new MasterReadPacket(0x6f00, 0x4e).toAscii();
let screenPoller = null;

function poll() {
  bus.emit("serial/write", READ_SCREEN);
}

bus.on("screen/poll", poll);

bus.on("mqtt/started", () => {
  screenPoller = Timer.repeat(poll, POLL_INTERVAL);
});

bus.on("engineer/connected", () => {
  if (screenPoller) {
    Timer.clear(screenPoller);
    screenPoller = null;
  }
});

//poll after kdb pressed
//bus.on("kbd/write", () => Timer.set(poll, 50));

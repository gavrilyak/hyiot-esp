import bus from "bus";
import Timer from "timer";
import { MasterReadPacket } from "mblike";

const POLL_INTERVAL = 10000;

//clock on green screen - 3rd line, symbols 11,12 14,15
//      on blue  screen - last 5 symbols on last line

const PER_LINE = 18;
const LINES = 4;
const SCAN_LEN = LINES * PER_LINE; // - 2; /*clock ignore minutes*/
const MINUTES_POS_1 = 3 * PER_LINE - 3;
const MINUTES_POS_2 = 4 * PER_LINE - 1;

function isScreenChanged(prev, curr) {
  let empty = true;
  let changed = false;
  for (let i = 0; i < SCAN_LEN; i++) {
    let val = curr[i];
    if (val != 0x20) empty = false;
    if (val == 0x1f) continue; //ignore menu cursor
    if (val == 0xda) continue; //ignore cursor
    if (val == 0x20) continue; //ignore space
    if (i == MINUTES_POS_1) continue;
    if (i == MINUTES_POS_2) continue;
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
  bus.emit("mqtt/pub", ["screen", packet.data.slice(0, 72).buffer, true]);
});

//screen
const READ_SCREEN = new MasterReadPacket(0x6f00, 0x4e).toAscii();
let screenPoller = null;
let pollingDisabled = false;

function poll() {
  if (pollingDisabled) return;
  bus.emit("serial/write", READ_SCREEN);
}

function disablePoll() {
  if (screenPoller) {
    Timer.clear(screenPoller);
    screenPoller = null;
  }
  pollingDisabled = true;
}

function enablePoll() {
  if (screenPoller) {
    Timer.clear(screenPoller);
  }
  screenPoller = Timer.repeat(poll, POLL_INTERVAL);
  pollingDisabled = false;
}

bus.on("screen/poll", poll);
bus.on("screen/stop", disablePoll);
bus.on("screen/start", enablePoll);

bus.on("mqtt/started", () => bus.emit("screen/start"));
bus.on("engineer/connected", () => bus.emit("screen/stop"));

//poll after immediately after kdb was pressed, user is interested in result
bus.on("kbd/write", () => Timer.set(() => bus.emit("screen/poll"), 50));

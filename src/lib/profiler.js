import Instrumentation from "instrumentation";
import Debug from "debug";
const FREE_MEM = 11;
const SLOTS = 14;
const CHUNKS = 15;
const KEYS = 16;

let last = {
  slots: 0,
  chunks: 0,
};
measure("INITIAL");
export function measure(name) {
  Debug.gc();
  let slots = Instrumentation.get(SLOTS);
  let chunks = Instrumentation.get(CHUNKS);
  trace(
    [
      "MEASURE",
      slots - last.slots,
      chunks - last.chunks,
      Math.round((slots + chunks) / 1024),
      "kB",
      name,
      "\n",
    ].join(" ")
  );
  last.slots = slots;
  last.chunks = chunks;
}
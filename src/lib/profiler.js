import Instrumentation from "instrumentation";
import Debug from "debug";
const FREE_MEM = 11;
const SLOTS = 14;
const CHUNKS = 15;
const KEYS = 16;

let last = {
  slots: 0,
  chunks: 0,
  freeMem: 0,
};
measure("INITIAL");
export function measure(name) {
  Debug.gc();
  let slots = Instrumentation.get(SLOTS);
  let chunks = Instrumentation.get(CHUNKS);
  let freeMem = Instrumentation.get(FREE_MEM);
  let total = slots + chunks;
  trace(
    [
      "MEASURE",
      total,
      slots - last.slots,
      chunks - last.chunks,
      total - (last.slots + last.chunks),
      Math.round(freeMem / 1024),
      "free ",
      last.freeMem - freeMem,
      "B ",
      name,
      "\n",
    ].join(" ")
  );
  last.slots = slots;
  last.chunks = chunks;
  last.freeMem = freeMem;
  return { slots, chunks, freeMem };
}

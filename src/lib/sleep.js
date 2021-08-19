import coro from "coro";
import Timer from "timer";
function* sleep(ms) {
  const cont = yield coro;
  let timer = Timer.set(() => {
    // @ts-ignore
    timer = null;
    cont(0, ms);
  }, ms);
  try {
    let result = yield;
    return result;
  } finally {
    if (timer) Timer.clear(timer);
  }
}
export default sleep;

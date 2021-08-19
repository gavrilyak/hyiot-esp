import coro from "coro";
function* waitForMultiple(gens) {
  const myContinuation = yield coro;
  let done = false;
  function raceHandler(error, result, continuation) {
    //console.log("join handler", error, result, continuation, done);
    if (done) return;
    if (error !== coro || !error) {
      done = true;
      myContinuation(null, { error, result, continuation });
    }
  }

  {
    const continuations = gens.map((gen) => coro(gen, raceHandler));
    // @ts-ignore
    gens = undefined;
    //todo: Handle errors
    const { error, result, continuation } = yield;
    let index;
    for (let i = 0; i < continuations.length; i++) {
      const cont = continuations[i];
      if (cont == continuation) {
        index = i;
      } else {
        cont("return", "Cancelled");
      }
    }
    //console.log("JOIN return", { error, result });
    if (error) throw error;
    return { index, result };
  }
}

export default waitForMultiple;

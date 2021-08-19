import coro from "coro";
function* join(gens, cb) {
  const myContinuation = yield coro;
  function joinHandler(error, result, continuation) {
    myContinuation(null, { error, continuation, result });
  }

  {
    let continuations = gens.map((gen) => coro(gen, joinHandler));
    // @ts-ignore
    gens = null;
    let results = [];
    let allDone = false;
    do {
      let { error, continuation, result } = yield;
      allDone = true;
      for (let index = 0; index < continuations.length; index++) {
        const cont = continuations[index];
        if (cont == continuation) {
          if (cb) cb(error, { result, index });
          results[index] = { error, result };
        } else {
          if (!results[index]) allDone = false;
        }
      }
    } while (!allDone);
    return results;
  }
}
export default join;

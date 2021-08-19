function noop(_err, _res, _continuation) {}
function coro(gen, handler = noop) {
  return (function continuation(err, res) {
    try {
      const { done, value } = !err
        ? gen.next(res)
        : err == "return"
        ? gen.return(res)
        : gen.throw(err);

      //console.log({ done, value });
      if (done) {
        //ok, generator is finished, pass result to caller
        handler(null, value, continuation);
      } else if (value === coro) {
        //it wants "continuation". give it
        if (value === coro) return continuation(null, continuation);
      } else if (value === void 0) {
        //it want's to suspend
        return continuation;
        //} else if (typeof value === "function") {
        // thunk yielded
        // pass resume fn so that it will wake up the generator when
        // async function will finish
        //
        //value(continuation);
      } else {
        // some other yield, pass it to caller
        // caller can have a word, if nothing from caller it will be just resumed
        // if caller throws, it will be resumed with error
        // error can be {return: 42} - in this case generator will return 42;
        trace("UNEXPECTED yield value:", value, "\n");
        handler(coro, value, continuation);
      }
    } catch (e) {
      handler(e, void 0, continuation);
    }
    return continuation;
  })(null);
}

export default coro;

import Modules from "modules";
import Worker from "worker";
export default function ({ bus, inWorker = true }) {
  let networkWorker;
  function start() {
    if (networkWorker) {
      debugger;
      trace("No double start");
      return;
    }
    if (inWorker) {
      networkWorker = new Worker("network", {
        allocation: 69 * 1024,
        stackCount: 560,
        slotCount: 1024,
      });
      networkWorker.onmessage = ([topic, payload]) => {
        bus.emit(topic, payload);
      };
      //bus.emit("started");
    } else {
      Modules.importNow("network");
    }
  }

  function out(message) {
    if (networkWorker) networkWorker.postMessage(message);
    else trace("No network");
  }

  function stop() {
    networkWorker.terminate();
    networkWorker = null;
    bus.emit("stopped");
  }
  return { start, stop, out };
}

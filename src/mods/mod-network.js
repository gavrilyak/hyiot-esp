import Modules from "modules";
import Worker from "worker";
export default function ({ bus, inWorker = true }) {
  let networkWorker;
  function start() {
    if (networkWorker) {
      trace("No double start");
      debugger;
    }
    if (inWorker) {
      networkWorker = new Worker("network", {
        //allocation: 63 * 1024,
        allocation: 60 * 1024,
        stackCount: 560,
        slotCount: 1024,
      });
      networkWorker.onmessage = ([topic, payload]) => {
        bus.emit(topic, payload);
      };
      //bus.emit("started");
    } else {
      networkWorker = Modules.importNow("network")();
    }
  }

  function out(message) {
    if (networkWorker) networkWorker.postMessage(message);
    else trace("No network");
  }

  function stop() {
    if (networkWorker != null) {
      if (networkWorker.terminate) {
        networkWorker.terminate();
      } else if (networkWorker.close) {
        networkWorker.close();
      }
    }
    networkWorker = null;
    bus.emit("stopped");
  }
  return { start, stop, out };
}

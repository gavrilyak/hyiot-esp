import coro from "coro";
function* start(name) {
  let cont = yield coro;
  const listener = (payload) => cont(null, payload);
  const topic = name + "/started";
  bus.on(topic, listener);
  try {
    bus.emit("start", name);
    return yield;
  } finally {
    bus.off(topic, listener);
  }
}

function* startSequence() {
  startHw();
  bus.emit("start", "pref");
  bus.emit("start", "tz");
  //bus.emit("start", "modem");
  //bus.emit("start", "gui");
  //bus.emit("start", "ble");
  bus.emit("start", "serial");
  if (!hasModem) bus.emit("start", "virtmodem"); //{name: "virtmodem", mod:"serial"});
  let startModem = hasModem;
  let startWifi = !hasModem;
  if (startModem) {
    bus.emit("start", "modem");
    //yield* start("wifiap");
    //yield* start("httpserver");
    //yield* start("telnet");
  } else if (startWifi) {
    for (;;) {
      yield* sleep(500); // this sleep improves a chance to connect :-)
      bus.emit("start", "wifista");
      let [topic] = yield* once(
        "wifista/started",
        "wifista/unfconfigured",
        "wifista/error"
      );
      if (topic == "wifista/unfconfigured") {
        yield* start("wifiap");
      } else if (topic == "wifista/error") {
        bus.emit("wifista/stop");
        yield* sleep(1000);
        continue;
      } else if (topic == "wifista/started") {
        yield* start("sntp");
        yield* start("mqtt");
      }
      yield* start("telnet");
      break;
    }
    //yield* start("lineserver");
  }
  //yield* start("wifiap");
  //yield* start("httpserver");
  //yield* start("telnet");
}

/**
 * @param {string[]} topics
 */
function* once(...topics) {
  const cont = yield coro;
  const listener = (payload, topic) => {
    cont(null, [topic, payload]);
    topics.forEach((topic) => bus.off(topic, listener));
  };
  try {
    topics.forEach((topic) => bus.on(topic, listener));
    return yield;
  } finally {
    topics.forEach((topic) => bus.off(topic, listener));
  }
}

function* mqttSaga() {
  let restart = false;
  for (;;) {
    if (restart) yield* sleep(1000);
    else yield* once("mqtt/start");
    trace("restarting");

    let worker = new Worker("mqtt-worker", {
      allocation: 38 * 1024,
      stackCount: 256, //4Kb
      //slotCount: 200,
    });
    worker.onmessage = ([topic, payload]) => bus.emit("mqtt/" + topic, payload);
    let [topic, payload] = yield* once(
      "mqtt/started",
      "mqtt/error",
      "mqtt/stopped"
    );
    if (topic === "mqtt/started") {
      restart = false;
      try {
        for (;;) {
          const proxyTopics = [
            "mqtt/pub",
            "mqtt/sub",
            "mqtt/unsub",
            "mqtt/stop",
          ];
          let [topic, payload] = yield* once(...proxyTopics, "mqtt/stopped");
          trace("SAGA", topic, ",", payload, "\n");
          if (proxyTopics.indexOf(topic) >= 0) {
            worker.postMessage([topic.slice(5), payload]);
          }
          if (topic === "mqtt/stop") {
            yield* once("mqtt/stopped");
            break;
          } else if (topic == "mqtt/stopped") {
            restart = true;
            break;
          }
        }
      } catch (e) {
        trace("ERROR in saga:", e.message, "\n");
      } finally {
        trace("terminating\n");
        worker.terminate();
      }
    } else {
      worker.terminate();
      trace("ERROR starting worker", topic, payload, "\n");
      restart = false;
    }
  }
}

function startAsync() {
  //coro(mqttSaga());
  coro(startSequence(), (err, res) => {
    trace("coro", err, res, "\n");
    //bus.emit("mqtt/start");
    //startMQTT();
  });
}

import Timer from "timer";
export default function PubSub() {
  let listenersByTopic = {};
  return {
    on: function (topic, listener) {
      let listeners = (listenersByTopic[topic] = listenersByTopic[topic] || []);
      listeners.push(listener);
    },
    off: function (topic, listener) {
      trace("off", topic, listener);
      const listeners = listenersByTopic[topic];
      if (!listeners) return;
      if (listener) {
        const index = listeners.indexOf(listener);
        listeners.splice(index >>> 0, 1);
      } else {
        delete listeners[topic];
      }
    },
    emit: function (topic, payload) {
      {
        let listeners = listenersByTopic[topic];
        if (listeners) for (let listener of listeners) listener(payload); //Promise.resolve(payload).then(listener);
      }
      {
        let listeners = listenersByTopic["*"];
        if (listeners)
          for (let listener of listeners)
            Promise.resolve().then(() => listener(topic, payload));
        //Timer.set(() => listener(topic, payload));
      }
    },
  };
}

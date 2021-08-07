export default function PubSub() {
  let listenersByTopic = {};
  return {
    on: function (topic, listener) {
      let listeners = (listenersByTopic[topic] = listenersByTopic[topic] || []);
      listeners.push(listener);
    },
    off: function (topic, listener) {
      const listeners = listenersByTopic[topic];
      if (!listeners) return;
      if (listener) {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
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
      }
    },
  };
}

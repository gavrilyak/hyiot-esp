export default function PubSub() {
  let channels = {};
  return {
    on: function (topic, listener) {
      let listeners = (channels[topic] = channels[topic] || []);
      listeners.push(listener);
    },
    off: function (topic, listener) {
      const listeners = channels[topic];
      if (!listeners) return;
      if (listener) {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      } else {
        delete listeners[topic];
      }
    },
    emit: function (topic, ...payload) {
      {
        let listeners = channels[topic];
        if (listeners)
          for (let listener of listeners) {
            //listener(...payload);
            Promise.resolve().then(() => listener(...payload));
          }
      }
      {
        let listeners = channels["*"];
        if (listeners)
          for (let listener of listeners)
            Promise.resolve().then(() => listener(topic, ...payload));
      }
    },
  };
}

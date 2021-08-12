/**
 * @callback listenerCallback
 * @param {any} payload
 */
export default function PubSub() {
  let channels = {};
  return {
    /**
     * @param {string} topic
     * @param {listenerCallback} listener
     * @returns {void}
     * */
    on: function (topic, listener) {
      let listeners = (channels[topic] = channels[topic] || []);
      listeners.push(listener);
    },

    /**
     * @param {string} topic
     * @param {listenerCallback} listener
     * @returns {void}
     * */
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

    /*
     * @param {string} topic
     * @param {string[]} payload
     * @returns {void}
     * */
    emit: function (topic, ...payload) {
      {
        let listeners = channels[topic];
        if (listeners)
          for (let listener of listeners) {
            //listener(...payload);
            Promise.resolve().then(() => {
              try {
                listener(...payload);
              } catch (e) {
                trace(`ERR in topic ${topic}: ${e}`);
              }
            });
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

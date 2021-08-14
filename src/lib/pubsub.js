import Timer from "timer";
/**
 * @callback listenerCallback
 * @param {any} payload
 */
class PubSub {
  constructor(prefix) {
    this.prefix = prefix;
    this.channels = new Map();
  }
  /**
   * @param {string} topic
   * @param {listenerCallback} listener
   * @returns {void}
   * */
  on(topic, listener) {
    let listeners = this.channels.get(topic);
    if (listeners == null) {
      listeners = [];
      this.channels.set(topic, listeners);
    }
    listeners.push(listener);
  }

  /**
   * @param {string} topic
   * @param {listenerCallback} listener
   * @returns {void}
   * */
  off(topic, listener) {
    const listeners = this.channels.get(topic);
    if (listeners == null) return;
    if (listener) {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    } else {
      this.channels.delete(topic);
    }
  }

  /*
   * @param {string} topic
   * @param {string[]} payload
   * @returns {void}
   * */
  emit(topic, ...payload) {
    {
      let listeners = this.channels.get(topic);
      if (listeners)
        for (let listener of listeners) {
          //listener(...payload);
          Timer.set(() => {
            try {
              listener(...payload);
            } catch (e) {
              trace(`ERR in topic ${topic}: ${e}`);
            }
          });
        }
    }
    {
      let listeners = this.channels.get("*");
      if (listeners)
        for (let listener of listeners)
          Timer.set(() => listener(topic, ...payload));
    }
  }
}

Object.freeze(PubSub.prototype);
export default PubSub;

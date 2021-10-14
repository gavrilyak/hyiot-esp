import Timer from "timer";
/**
 * @callback listenerCallback
 * @param {any} payload
 */
class PubSub {
  constructor(useTimer = true) {
    this.channels = new Map();
    this.useTimer = useTimer;
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
  emit(topic, payload) {
    {
      let listeners = this.channels.get(topic);
      if (listeners) {
        if (this.useTimer) {
          for (let listener of listeners)
            Timer.set(() => listener(payload, topic));
        } else {
          for (let listener of listeners) listener(payload, topic);
        }
      }
    }
    {
      let listeners = this.channels.get("*");
      if (listeners) {
        if (this.useTimer) {
          for (let listener of listeners)
            Timer.set(() => listener(payload, topic));
        } else {
          for (let listener of listeners) listener(payload, topic);
        }
      }
    }
  }

  once(topic, listener) {
    let that = this;
    this.on(topic, function listenerStub(payload) {
      listener(payload);
      that.off(topic, listenerStub);
    });
  }
}

Object.freeze(PubSub.prototype);
export default PubSub;

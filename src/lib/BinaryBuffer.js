import CircularBuffer from "./CircularBuffer";
const DEBUG = false;
class BinaryBuffer {
  _queue;
  _buffered;
  _pos;

  constructor(capacity = 10) {
    this._queue = new CircularBuffer(capacity);
  }

  write(item) {
    if (this._queue.length >= this._queue.capacity()) {
      throw Error("Buffer Overflow");
    }
    this._queue.push(item);
  }

  read(count) {
    if (!this._buffered) {
      if (this._queue.length == 0) return null;
      this._buffered = this._queue.shift();
      this._pos = 0;
    }

    let buffered = this._buffered;

    if (buffered.byteLength <= count && this._pos === 0) {
      DEBUG && trace(count, "=", buffered.byteLength, "!\n");
      //we can return whole buffer;
      this._buffered = null;
      return [buffered, buffered];
    }
    let start = this._pos;
    let end = start + count;
    let res = this._buffered.slice(start, end);
    if (end >= this._buffered.byteLength) {
      DEBUG && trace(count, "=", this._buffered.byteLength, ".\n");
      this._pos = 0;
      this._buffered = null;
      return [res, buffered];
    } else {
      this._pos = end;
      DEBUG && trace(count, ",");
      return [res, null];
    }
  }
}
export default BinaryBuffer;

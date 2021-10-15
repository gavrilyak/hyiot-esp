import CircularBuffer from "./CircularBuffer";
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
    if (this._buffered.byteLength <= count && this._pos === 0) {
      //we can return whole buffer;
      let res = this._buffered;
      this._buffered = null;
      return res;
    }
    let start = this._pos;
    let end = start + count;
    let res = this._buffered.slice(start, end);
    if (end >= this._buffered.byteLength) {
      this._pos = 0;
      this._buffered = null;
    } else {
      this._pos = end;
    }
    return res;
  }
}
export default BinaryBuffer;

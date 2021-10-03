import CircularBuffer from "./CircularBuffer";
class BinaryBuffer {
  #queue;
  #current;
  #pos;

  constructor(capacity = 10) {
    this.#queue = new CircularBuffer(capacity);
  }

  write(item) {
    if (this.#queue.length >= this.#queue.capacity()) {
      throw Error("Buffer Overflow");
    }
    this.#queue.push(item);
  }

  read(count) {
    if (!this.#current) {
      if (this.#queue.length == 0) return null;
      this.#current = this.#queue.shift();
      this.#pos = 0;
    }
    if (this.#current.byteLength <= count && this.#pos === 0) {
      //we can return whole buffer;
      let res = this.#current;
      this.#current = null;
      return res;
    }
    let start = this.#pos;
    let end = start + count;
    let res = this.#current.slice(start, end);
    if (end >= this.#current.byteLength) {
      this.#pos = 0;
      this.#current = null;
    } else {
      this.#pos = end;
    }
    return res;
  }
}
export default BinaryBuffer;

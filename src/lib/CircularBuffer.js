export default function CircularBuffer(capacity) {
  if (!(this instanceof CircularBuffer)) return new CircularBuffer(capacity);
  if (
    typeof capacity == "object" &&
    Array.isArray(capacity["_buffer"]) &&
    typeof capacity._capacity == "number" &&
    typeof capacity._first == "number" &&
    typeof capacity.length == "number"
  ) {
    for (var prop in capacity) {
      if (capacity.hasOwnProperty(prop)) this[prop] = capacity[prop];
    }
  } else {
    if (typeof capacity != "number" || capacity % 1 != 0 || capacity < 1)
      throw new TypeError("Invalid capacity");
    this._buffer = new Array(capacity);
    this._capacity = capacity;
    this._first = 0;
    this.length = 0;
  }
}

CircularBuffer.prototype = {
  size: function () {
    return this.length;
  },
  capacity: function () {
    return this._capacity;
  },
  enq: function (value) {
    if (this._first > 0) this._first--;
    else this._first = this._capacity - 1;
    this._buffer[this._first] = value;
    if (this.length < this._capacity) this.length++;
  },
  push: function (value) {
    if (this.length == this._capacity) {
      this._buffer[this._first] = value;
      this._first = (this._first + 1) % this._capacity;
    } else {
      this._buffer[(this._first + this.length) % this._capacity] = value;
      this.length++;
    }
  },
  deq: function () {
    if (this.length == 0) throw new RangeError("dequeue on empty buffer");
    var value = this._buffer[(this._first + this.length - 1) % this._capacity];
    this.length--;
    return value;
  },
  pop: function () {
    return this.deq();
  },
  shift: function () {
    if (this.length == 0) throw new RangeError("shift on empty buffer");
    var value = this._buffer[this._first];
    this._buffer[this._first] = undefined;
    if (this._first == this._capacity - 1) this._first = 0;
    else this._first++;
    this.length--;
    return value;
  },
  get: function (start, end) {
    if (this.length == 0 && start == 0 && (end == undefined || end == 0))
      return [];
    if (typeof start != "number" || start % 1 != 0 || start < 0)
      throw new TypeError("Invalid start");
    if (start >= this.length)
      throw new RangeError("Index past end of buffer: " + start);

    if (end == undefined)
      return this._buffer[(this._first + start) % this._capacity];

    if (typeof end != "number" || end % 1 != 0 || end < 0)
      throw new TypeError("Invalid end");
    if (end >= this.length)
      throw new RangeError("Index past end of buffer: " + end);

    if (this._first + start >= this._capacity) {
      //make sure first+start and first+end are in a normal range
      start -= this._capacity; //becomes a negative number
      end -= this._capacity;
    }
    if (this._first + end < this._capacity)
      return this._buffer.slice(this._first + start, this._first + end + 1);
    else
      return this._buffer
        .slice(this._first + start, this._capacity)
        .concat(this._buffer.slice(0, this._first + end + 1 - this._capacity));
  },
  toarray: function () {
    if (this.length == 0) return [];
    return this.get(0, this.length - 1);
  },
};

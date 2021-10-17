if (!("fromArrayBuffer" in String)) {
  String.fromArrayBuffer = (ab) => Buffer.from(ab).toString("utf8");
}

if (!("fromString" in ArrayBuffer)) {
  ArrayBuffer.fromString = (s) => new Uint8Array(Buffer.from(s, "utf8")).buffer;
}
const SEMI = ":".charCodeAt(0);
const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);

const MASTER_BYTE = ">".charCodeAt(0);
const SLAVE_BYTE = "<".charCodeAt(0);

function fromHexLetter(c) {
  let code = c & 0b0100_1111;
  return code > 9 ? code - 0x37 : code;
}

function toHexLetter(b) {
  return b + (b > 9 ? 0x37 : 0x30);
}

function checksum(arr) {
  let sum = 0;
  for (let i = 0, l = arr.length; i < l; i++) sum += arr[i];
  return -sum & 0xff;
}

export function Uint8Array_fromHexArray(
  ascii,
  bin = new Uint8Array(ascii.length >> 1)
) {
  for (let asciiPos = 0, i = 0, binLen = bin.length; i < binLen; i++)
    bin[i] =
      (fromHexLetter(ascii[asciiPos++]) << 4) +
      fromHexLetter(ascii[asciiPos++]);
  return bin;
}

export function asciiPacketToBin(ascii, isMaster) {
  let asciiLen = ascii.length;
  if (ascii[0] != SEMI) throw Error("Invalid packet start:" + ascii[0]);
  if (ascii[asciiLen - 1] != LF)
    throw Error("Invalid packet end:" + asciiLen[asciiLen - 1]);
  let tailLen = 4;
  if ((ascii[asciiLen - 2] & 0x7f) != CR) {
    tailLen = 3;
    //we allow such packet for convinience
  }

  let asciiPos = 1;
  let asciiBody = ascii.subarray(asciiPos, asciiLen - tailLen);
  let bin = new Uint8Array(1 + (asciiBody.length >> 1));
  bin[0] = isMaster ? MASTER_BYTE : SLAVE_BYTE;
  let binBody = Uint8Array_fromHexArray(asciiBody, bin.subarray(1));
  asciiPos += binBody.length << 1;
  let validChecksum = checksum(binBody);
  let sum =
    (fromHexLetter(ascii[asciiPos++]) << 4) + fromHexLetter(ascii[asciiPos++]);
  if (validChecksum != sum) throw Error("Checksum fail");
  return bin.buffer;
}

export function Uint8Array_toHexArray(
  arr,
  into = new Uint8Array(arr.length << 1),
  intoPos = 0
) {
  for (let i = 0, binLen = arr.length; i < binLen; i++) {
    let c = arr[i];
    into[intoPos++] = toHexLetter(c >>> 4);
    into[intoPos++] = toHexLetter(c & 0xf);
  }
  return into;
}

export function binPacketToAscii(binBuf, offset = 1) {
  let bin = new Uint8Array(binBuf, offset);
  let binLen = bin.length;
  let asciiLen = 1 + binLen * 2 + 2 + 2;
  let ascii = new Uint8Array(asciiLen);
  let asciiPos = 0;

  ascii[asciiPos++] = SEMI;
  Uint8Array_toHexArray(bin, ascii, asciiPos);
  asciiPos += binLen << 1;
  let sum = checksum(bin);
  ascii[asciiPos++] = toHexLetter(sum >>> 4);
  ascii[asciiPos++] = toHexLetter(sum & 0xf);
  ascii[asciiPos++] = CR;
  ascii[asciiPos++] = LF;
  return ascii.buffer;
}

function registerToString(reg) {
  return reg.toString(16).toUpperCase().padStart(4, "0");
}

function dataToString(data) {
  return String.fromArrayBuffer(Uint8Array_toHexArray(data).buffer);
}

function dataLengthToString(dataLength) {
  return dataLength.toString(16).toUpperCase().padStart(2, "0");
}

const CMD_READ = 0x03;
const CMD_WRITE = 0x10;

const defaultView = new DataView(new ArrayBuffer(0));

function canBeCompressed(value) {
  if (value != null && value.length > 1) {
    let first = value[0];
    return !value.some((x) => x !== first);
  } else {
    return false;
  }
}

class MBLikePacket {
  //@ type DataView
  v;
  isAscii = false;
  constructor(v = defaultView) {
    this.v = v;
  }

  get isMaster() {
    return this.v.getUint8(0) == MASTER_BYTE;
  }

  set isMaster(value) {
    this.v.setUint8(0, value ? MASTER_BYTE : SLAVE_BYTE);
  }

  get address() {
    return this.v.getUint8(1);
  }
  set address(value) {
    this.v.setUint8(1, value);
  }

  get isCompressed() {
    return Boolean(this.v.getUint8(1) & 0x80);
  }

  checkCompression() {
    return canBeCompressed(this.data);
  }

  get cmd() {
    return this.v.getUint8(2) & 0x7f;
  }
  set cmd(value) {
    this.v.setUint8(2, value & 0x7f); //(this.v.getUint8(1) & 0x80) | (value & 0x7f));
  }

  get data() {
    let dataOffset = this.constructor.dataOffset;
    if (dataOffset == null) return null;
    return new Uint8Array(this.v.buffer, this.v.byteOffset + dataOffset);
  }

  set data(value) {
    if (value == null) return;
    let dataOffset = this.constructor.dataOffset;
    if (dataOffset == null)
      throw Error("Data unsupported for this type of packet");
    this.dataLength = value.length;
    //this.isCompressed = canBeCompressed(value);
    new Uint8Array(this.v.buffer, this.v.byteOffset).set(value, dataOffset);
  }
  toAscii() {
    return binPacketToAscii(this.v.buffer, this.v.byteOffset + 1);
  }
  toBinary() {
    return this.v.buffer;
  }
}

export class MasterReadPacket extends MBLikePacket {
  constructor(register, length = 1, address = 1) {
    if (typeof register == "object") {
      super(register);
    } else {
      super(new DataView(new ArrayBuffer(8)));
      this.isMaster = true;
      this.address = address;
      this.cmd = CMD_READ;
      this.register = register;
      this.dataLength = length;
    }
  }

  get register() {
    return this.v.getUint32(3);
  }

  set register(value) {
    this.v.setUint32(3, value);
  }

  get dataLength() {
    return this.v.getUint8(7);
  }

  set dataLength(value) {
    this.v.setUint8(7, value);
  }

  static get dataOffset() {
    return null;
  }

  toString() {
    return [
      ">R",
      registerToString(this.register),
      dataLengthToString(this.dataLength),
    ].join(" ");
  }
}

export class MasterWritePacket extends MBLikePacket {
  constructor(register, data, address = 1) {
    if (typeof register == "object") {
      super(register);
    } else {
      super(new DataView(new ArrayBuffer(data.length + 8)));
      this.isMaster = true;
      this.address = address;
      this.cmd = CMD_WRITE;
      this.register = register;
      this.data = data;
    }
  }
  get register() {
    return this.v.getUint32(3);
  }
  set register(value) {
    this.v.setUint32(3, value);
  }

  get dataLength() {
    return this.v.getUint8(7);
  }

  set dataLength(value) {
    this.v.setUint8(7, value);
  }

  static get dataOffset() {
    return 8;
  }

  toString() {
    return [
      ">W",
      registerToString(this.register),
      dataToString(this.data),
    ].join(" ");
  }
}

export class SlaveReadPacket extends MBLikePacket {
  constructor(register, data, address = 1) {
    if (typeof register == "object") {
      super(register);
    } else {
      super(new DataView(new ArrayBuffer(data.length + 4)));
      this.isMaster = false;
      this.address = address;
      this.cmd = CMD_READ;
      this.register = register;
      this.data = data;
    }
  }

  get dataLength() {
    return this.v.getUint8(3);
  }
  set dataLength(value) {
    this.v.setUint8(3, value);
  }

  static get dataOffset() {
    return 4;
  }

  toString() {
    return [
      "<R",
      dataLengthToString(this.dataLength),
      dataToString(this.data),
    ].join(" ");
  }
}

export class SlaveWritePacket extends MBLikePacket {
  constructor(register, address = 1) {
    if (typeof register == "object") {
      super(register);
    } else {
      super(new DataView(new ArrayBuffer(7)));
      this.isMaster = false;
      this.address = address;
      this.cmd = CMD_WRITE;
      this.register = register;
    }
  }

  get register() {
    return this.v.getUint32(3);
  }

  set register(value) {
    this.v.setUint32(3, value);
  }

  static get dataOffset() {
    return null;
  }

  toString() {
    return ["<W", registerToString(this.register)].join(" ");
  }
}

export function parseMasterPacket(packet) {
  const v = new DataView(packet);
  const Ctor =
    v.getUint8(2) == CMD_WRITE ? MasterWritePacket : MasterReadPacket;
  return new Ctor(v);
}

export function parseSlavePacket(packet) {
  const v = new DataView(packet);
  const Ctor = v.getUint8(2) == CMD_WRITE ? SlaveWritePacket : SlaveReadPacket;
  return new Ctor(v);
}

export function parse(buf, isMaster) {
  let arr = new Uint8Array(buf);
  switch (arr[0]) {
    case SEMI: {
      let binPacket = asciiPacketToBin(arr, isMaster);
      let packet = isMaster
        ? parseMasterPacket(binPacket)
        : parseSlavePacket(binPacket);
      packet.isAscii = true;
      return packet;
    }
    case MASTER_BYTE:
      return parseMasterPacket(buf);
    case SLAVE_BYTE:
      return parseSlavePacket(buf);
    default:
      throw Error("Unsupported packet signature: 0x" + arr[0].toString(16));
  }
}

export function toAscii(buf) {
  let arr = new Uint8Array(buf);
  switch (arr[0]) {
    case SEMI:
      return buf;
    case MASTER_BYTE:
      return parseMasterPacket(buf).toAscii();
    case SLAVE_BYTE:
      return parseSlavePacket(buf).toAscii();
    default:
      throw Error("Unsupported packet signature: 0x" + arr[0].toString(16));
  }
}

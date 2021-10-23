import { getMacBin } from "native/esp32";

var ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; //crock
function int30toBase32(n, abet = ALPHABET) {
  let result =
    abet[(n >> 25) & 0x1f] +
    abet[(n >> 20) & 0x1f] +
    abet[(n >> 15) & 0x1f] +
    abet[(n >> 10) & 0x1f] +
    abet[(n >> 5) & 0x1f] +
    abet[(n >> 0) & 0x1f];
  return result;
}

function calcDefaultDeviceId(mac) {
  const mac32 = new DataView(mac.buffer).getUint32(mac.length - 4);
  const mac30 = mac32 >>> 2; // two last bits are alway zero in esp32, it has 4 MACS
  const id = ALPHABET[mac[1] & 0x1f] + int30toBase32(mac30);
  return id;
}

const calculatedId = calcDefaultDeviceId(new Uint8Array(getMacBin()));
export default function getDefaultDeviceId() {
  return calculatedId;
}

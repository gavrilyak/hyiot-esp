import { getMacBin } from "native/esp32";

function toBase(base, alphabet, n) {
  let result = "";
  while (n) {
    result = alphabet[n % base] + result;
    n = Math.floor(n / base);
  }
  return result;
}

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; //crock
const toBase32 = (n) => toBase(32, ALPHABET, n);

function calcDefaultDeviceId(mac) {
  const v = new DataView(mac);
  const mac5bits = v.getUint8(1) & 0b11111;
  const mac30 = v.getUint32(2) >> 2;
  return toBase32(mac5bits * (1 << 30) + mac30);
}

const calculatedId = calcDefaultDeviceId(getMacBin());
export default function getDefaultDeviceId() {
  return calculatedId;
}

/**
 * @param {Uint8Array} buf
 * @param {string} name
 * @returns {Uint8Array|null}
 */

function getString(buf, start, end) {
  const a = buf.slice(start, end);
  const b = a.buffer;
  const str = String.fromArrayBuffer(b);
  return str;
}

function getFileFromArchive(buf, name) {
  for (let p = 0; ; p < buf.byteLength) {
    let end = buf.indexOf(0x0a, p);
    if (end < 0) break;
    let filename = getString(buf, p, end);
    p = end + 1;

    end = buf.indexOf(0x0a, p);
    if (end < 0) break;
    let size = Number(getString(buf, p, end));
    p = end + 1;

    if (filename == name) return buf.subarray(p, p + size);
    p += size;
    p += 1;
  }
  return null;
}

export default getFileFromArchive;

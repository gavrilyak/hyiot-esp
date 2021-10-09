function getString(buf, start, end) {
  const a = buf.slice(start, end, false);
  const b = a.buffer;
  const str = String.fromArrayBuffer(b);
  return str;
}

/**
 * @param {Uint8Array} buf
 * @param {string} name
 * @returns {Uint8Array|null}
 */
function getFileFromArchive(buf, name) {
  if (buf[0] == 0xff && buf[1] == 0xff) return null; //EMPTY flash
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

const CR = 0x0a;
const SP = 0x20;
const EQ = 0x3d;
const OB = 0x5b;
const CB = 0x5d;

function findSection(bin, section) {
  let pos = 0;
  for (;;) {
    pos = bin.indexOf(OB, pos) + 1;
    if (!pos) return 0;
    let c;
    for (let i = 0; ; i++) {
      c = bin[pos];
      if (c !== section.charCodeAt(i)) break;
      pos++;
    }
    pos++;
    if (c === CB) return pos;
  }
}

function findKey(bin, pos, name) {
  for (;;) {
    pos = bin.indexOf(CR, pos);
    let c;
    if (!pos) return 0;
    c = bin[++pos];
    if (c === OB) return 0; // Next section, not found
    for (let i = 0; ; i++) {
      c = bin[pos];
      if (c !== name.charCodeAt(i)) break;
      pos++;
    }
    pos++;
    if (c === EQ) return pos;
  }
}

export function get(ab, section, key) {
  let bin = new Uint8Array(ab);
  let pos = findSection(bin, section);
  if (!pos) return null;
  pos = findKey(bin, pos, key);
  if (!pos) return null;
  let part = bin.slice(pos, bin.indexOf(CR, pos));
  return String.fromArrayBuffer(part.buffer);
}

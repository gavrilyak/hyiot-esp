import Inflate from "inflate";

const compressed1 = Uint8Array.of(
  0x78,
  0xda,
  0x63,
  0x60,
  0x64,
  0x62,
  0x66,
  0x61,
  0x65,
  0x63,
  0x67,
  0x80,
  0xd2,
  0x00,
  0x01,
  0x98,
  0x00,
  0x39
);

const compressed2 = Uint8Array.of(
  0x78,
  0xda,
  0xed,
  0xc5,
  0xb1,
  0x0d,
  0x00,
  0x20,
  0x08,
  0x00,
  0x30,
  0x04,
  0x84,
  0xff,
  0x3f,
  0xf6,
  0x0e,
  0x93,
  0x76,
  0x69,
  0x9c,
  0xac,
  0xbe,
  0xb3,
  0x61,
  0xdb,
  0xb6,
  0x6d,
  0xdb,
  0xb6,
  0x6d,
  0xdb,
  0xb6,
  0x6d,
  0xdb,
  0xb6,
  0xbf,
  0xfd,
  0x01,
  0x19,
  0x00,
  0x70,
  0x01
);

{
  trace("compressed2\n");
  let inflator = new Inflate();
  inflator.push(compressed2.buffer, true);
  tracePacket("", new Uint8Array(inflator.result));
  trace("compessed2 end\n");
}
{
  trace("compressed1\n");
  let inflator = new Inflate();
  inflator.push(compressed1.buffer, true);
  tracePacket("", new Uint8Array(inflator.result));
  trace("compressed1\n");
}
function tracePacket(prefix, bytes) {
  for (let i = 0; i < bytes.length; i += 16) {
    let line = prefix;
    let end = i + 16;
    if (end > bytes.length) end = bytes.length;
    for (let j = i; j < end; j++) {
      let byte = bytes[j].toString(16);
      if (byte.length < 2) byte = "0" + byte;
      line += byte + " ";
    }
    trace(line, "\n");
  }
}

import X509 from "x509";
import Ber from "ber";

function getSubjectCommonName(cert) {
  const { subject } = X509.decodeTBS(X509.decode(new Uint8Array(cert)).tbs);
  let ber = new Ber(subject);
  ber.getTag(), ber.getLength();
  let b;
  while ((b = ber.next()).length) {
    let set = new Ber(b);
    set.getTag(), set.getLength();

    let seq = new Ber(set.next());
    seq.getTag(), seq.getLength();
    const oid = new Ber(seq.next()).getObjectIdentifier().toString();
    if (oid === "2,5,4,3") {
      const s = new Ber(seq.next());
      s.getTag();
      s.getLength();
      const from = s.next();
      const cn = String.fromArrayBuffer(
        from.buffer.slice(from.byteOffset, from.byteOffset + from.length)
      );
      return cn;
    }
  }
  return null;
}

export { getSubjectCommonName as default };

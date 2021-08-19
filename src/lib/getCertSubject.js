import X509 from "x509";
import Ber from "ber";
/*
C (Country):	US
ST (State):	FL
L (Locality):	Jacksonville
O (Organization):	Hydrolec Inc
OU (Organizational Unit):	IOT
CN (Common Name):	Hydrolec IOT CA
SN (Serial Number)
*/

const KNOWN_OIDS = Object.freeze({
  "2,5,4,3": "CN",
  "2,5,4,5": "SN",
  "2,5,4,6": "C",
  "2,5,4,7": "L",
  "2,5,4,8": "ST",
  "2,5,4,10": "O",
  "2,5,4,11": "OU",
});

function getCertSubject(cert) {
  if (!cert || cert.length == 0) return null;
  const { subject } = X509.decodeTBS(X509.decode(new Uint8Array(cert)).tbs);
  let ber = new Ber(subject);
  ber.getTag(), ber.getLength();
  let b;
  let results = {};
  while ((b = ber.next()).length) {
    let set = new Ber(b);
    set.getTag(), set.getLength();

    let seq = new Ber(set.next());
    seq.getTag(), seq.getLength();
    const oid = new Ber(seq.next()).getObjectIdentifier().toString();
    const s = new Ber(seq.next());
    s.getTag();
    s.getLength();
    const from = s.next();
    const strVal = String.fromArrayBuffer(
      from.buffer.slice(from.byteOffset, from.byteOffset + from.length)
    );
    const name = KNOWN_OIDS[oid] ?? oid;
    results[name] = strVal;
  }
  return results;
}

export default getCertSubject;

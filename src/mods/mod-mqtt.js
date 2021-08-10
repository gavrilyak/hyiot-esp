import Client from "mqtt";
import SecureSocket from "securesocket";
import Resource from "Resource";
//import bus from "bus";

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

export default function (config = {}) {
  //trace(Object.entries(config) + "\n");
  const {
    host = "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
    port = 443,
    applicationLayerProtocolNegotiation = ["x-amzn-mqtt-ca"],
    certificate = new Resource("certs/aws.iot.der"),
    clientKey = new Resource("certs/device.pk8"),
    clientCertificates = [
      new Resource("certs/device.der"),
      new Resource("certs/rootCA.der"),
    ],
    id = getSubjectCommonName(clientCertificates[0]),
    bus,
  } = config;

  let client = null;

  const pub = ({ topic, payload }) => client?.publish(topic, payload);
  const sub = ({ topic }) => client?.subscribe(topic);
  const unsub = ({ topic }) => client?.unsubscribe(topic);

  function onReady() {
    bus.emit("started");
  }

  function onClose() {
    if (client) bus.emit("stopped");
    client = null;
  }

  function onMessage(topic, body) {
    const payload = String.fromArrayBuffer(body);
    bus.emit("message", { topic, payload });
  }

  const stop = () => {
    client?.close();
    onClose();
  };

  function start() {
    stop();

    client = new Client({
      host,
      id,
      port,
      Socket: SecureSocket,
      secure: {
        protocolVersion: 0x0303,
        certificate,
        clientKey,
        clientCertificates,
        applicationLayerProtocolNegotiation,
        trace: Boolean(config.trace),
      },
    });

    Object.assign(client, {
      onReady: onReady,
      onClose: onClose,
      onMessage,
    });
    return client;
  }

  bus.on("start", start);

  return {
    start,
    stop,
    pub,
    sub,
    unsub,
    depends: ["network"],
  };
}
//export default connectToMQTT;

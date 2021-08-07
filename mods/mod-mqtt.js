import Client from "mqtt";
import SecureSocket from "securesocket";
import Net from "net";
import Resource from "Resource";
import bus from "bus";

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

let client = null;

const sub = ({ topic }) => client?.subscribe(topic);
const unsub = ({ topic }) => client?.unsubscribe(topic);
const pub = ({ topic, payload }) => client?.publish(topic, payload);

function on() {
  bus.on("mqtt_pub", pub);
  bus.on("mqtt_sub", sub);
  bus.on("mqtt_unsub", unsub);
  bus.on("mqtt_stop", stop);
  bus.emit("mqtt_started");
}

function off() {
  bus.off("mqtt_pub", pub);
  bus.off("mqtt_sub", sub);
  bus.off("mqtt_unsub", unsub);
  bus.off("mqtt_stop", stop);
  bus.emit("mqtt_stopped");
}

function onMessage(topic, body) {
  const payload = String.fromArrayBuffer(body);
  bus.emit("mqtt_message", { topic, payload });
}

const stop = () => {
  off();
  client?.close();
  client = null;
};

function connect(message = {}) {
  const {
    host = "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
    port = 443,
    certificate = new Resource("aws.iot.der"),
    clientCertificate = new Resource("device.der"),
    rootCertificate = new Resource("rootCA.der"),
    clientKey = new Resource("device.pk8"),
    id = getSubjectCommonName(clientCertificate),
  } = message;

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
      clientCertificates: [clientCertificate, rootCertificate],
      applicationLayerProtocolNegotiation: ["x-amzn-mqtt-ca"],
      trace: false,
    },
  });

  Object.assign(client, {
    onReady: on,
    onClose: off,
    onMessage,
  });
  return client;
}

bus.on("mqtt_start", connect);
//export default connectToMQTT;

import Client from "mqtt";
import SecureSocket from "securesocket";
import Net from "net";
import Resource from "Resource";
import bus from "bus";

function connectToMQTT(message = {}) {
  const {
    host = "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
    port = 443,
    certificate = new Resource("aws.iot.der"),
    clientCertificate = new Resource("smartgate1.der"),
    clientKey = new Resource("smartgate1.pk8"),
    id = "moddable_" + Net.get("MAC"),
  } = message;

  const client = new Client({
    host,
    id,
    port,
    Socket: SecureSocket,
    secure: {
      protocolVersion: 0x0303,
      certificate,
      clientKey,
      clientCertificates: [clientCertificate],
      applicationLayerProtocolNegotiation: ["x-amzn-mqtt-ca"],
      //trace: true,
    },
  });

  const sub = ({ topic }) => client.subscribe(topic);
  const unsub = ({ topic }) => client.unsubscribe(topic);
  const pub = ({ topic, payload }) => client.publish(topic, payload);

  function on() {
    bus.on("mqtt_pub", pub);
    bus.on("mqtt_sub", sub);
    bus.on("mqtt_unsub", unsub);
    bus.on("mqtt_stop", stop);
    bus.emit("mqtt_started", { ...message });
  }

  function off() {
    bus.off("mqtt_pub", pub);
    bus.off("mqtt_sub", sub);
    bus.off("mqtt_unsub", unsub);
    bus.off("mqtt_stop", stop);
    bus.emit("mqtt_stopped");
  }

  const stop = () => {
    off();
    client.close();
  };

  Object.assign(client, {
    onReady: on,
    onClose: off,
    onMessage(topic, body) {
      const payload = String.fromArrayBuffer(body);
      bus.emit("mqtt_message", { ...message, topic, payload });
    },
  });
  return client;
}

bus.on("mqtt_start", connectToMQTT);
//export default connectToMQTT;

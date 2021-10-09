import getBlob from "getBlob";
import Client from "mqtt";
import SecureSocket from "securesocket";
import getCertSubject from "getCertSubject";
import getDefaultDeviceId from "getDefaultDeviceId";

const specialPrefixes = {
  $rules: "$aws/rules", ///${ruleName}",
  $jobs: "$aws/things/{id}/jobs",
  $shadow: "$aws/things/{id}/shadow",
  $direct: "",
};

const GET_DELTA = "/update/delta";

export default function (config = {}) {
  //trace(Object.entries(config) + "\n");
  const { protocol, host, port, bus } = config;
  const clientCertificates = config.clientCertificates?.map(getBlob);
  let client = null;
  let id;
  {
    id = config.id;
    if (id == null && clientCertificates)
      id = getCertSubject(clientCertificates[0])?.CN;
    if (id == null) id = getDefaultDeviceId(); //throw Error("mqtt: no client id");
  }

  function translateTopic(topic) {
    if (topic.startsWith("$")) {
      const [first, ...other] = topic.split("/");
      let special = specialPrefixes[first];
      if (special == null) throw Error(`Unsupported special topic ${first}`);
      return special
        ? special.replace("{id}", id) + "/" + other.join("/")
        : other.join("/");
    } else {
      return `${id}/${topic}`;
    }
  }
  const isConnected = (client) => {
    if (!client) return false;
    if (client.state != 2) return false;
    return true;
  };

  const pub = ([topic, payload, directTopic]) => {
    if (isConnected(client)) {
      client.publish(directTopic || translateTopic(topic), payload);
    }
  };

  const sub = (topic) => {
    if (isConnected(client)) client.subscribe(translateTopic(topic));
  };

  const unsub = (topic) => {
    if (isConnected(client)) client.unsubscribe(translateTopic(topic));
  };

  function onReady() {
    bus.emit("started", { protocol, host });
  }

  function onClose() {
    if (client) bus.emit("stopped");
    client = null;
  }

  function onMessage(topic, payload) {
    //const payload = String.fromArrayBuffer(body);
    bus.emit("message", [topic, payload]);
  }

  const stop = () => {
    client?.close();
    onClose();
  };

  function start() {
    stop();
    try {
      client = new Client({
        host,
        id,
        port,
        ...(protocol === "mqtts"
          ? {
              Socket: SecureSocket,
              secure: {
                protocolVersion: 0x0303,
                certificate: getBlob(config.certificate),
                clientKey: getBlob(config.clientKey),
                clientCertificates,
                applicationLayerProtocolNegotiation:
                  config.applicationLayerProtocolNegotiation,
                trace: Boolean(config.traceSSL),
              },
            }
          : {}),
      });

      Object.assign(client, {
        onReady: onReady,
        onClose: onClose,
        onMessage,
      });
      return client;
    } catch (e) {
      bus.emit("error", e);
    }
  }

  return {
    start,
    stop,
    pub,
    sub,
    unsub,
  };
}
//export default connectToMQTT;

import getBlob from "getBlob";
import Client from "mqtt";
import SecureSocket from "securesocket";
import getCertSubject from "getCertSubject";
const specialPrefixes = [
  "$aws/rules/${ruleName}",
  "$aws/things/${thingName}/jobs",
  "$aws/things/thingName/shadow",
];

export default function (config = {}) {
  //trace(Object.entries(config) + "\n");
  const { protocol, host, port, bus } = config;
  const clientCertificates = config.clientCertificates?.map(getBlob);
  let client = null;
  let id;
  {
    id = config.id;
    if (id == null) id = getCertSubject(getBlob("fctry://l/device.der"))?.CN;
    if (id == null) throw Error("mqtt: no client id");
  }

  const isConnected = (client) => {
    if (!client) return false;
    if (client.state != 2) return false;
    return true;
  };

  const pub = ([topic, payload]) => {
    if (isConnected(client)) client.publish(`${id}/${topic}`, payload);
  };

  const sub = (topic) => {
    if (isConnected(client)) client.subscribe(`${id}/${topic}`);
  };

  const unsub = (topic) => {
    if (isConnected(client)) client.unsubscribe(`${id}/${topic}`);
  };

  function onReady() {
    bus.emit("started", { protocol, host });
  }

  function onClose() {
    if (client) bus.emit("stopped");
    client = null;
  }

  function onMessage(topic, body) {
    const payload = String.fromArrayBuffer(body);
    bus.emit("message", [topic, payload]);
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

import Client from "mqtt";
import SecureSocket from "securesocket";
export default function (config = {}) {
  //trace(Object.entries(config) + "\n");
  const { protocol, host, port, id, bus } = config;

  let client = null;

  const isConnected = (client) => {
    if (!client) return false;
    if (client.state != 2) return false;
    return true;
  };

  const pub = ({ topic, payload }) => {
    if (isConnected(client)) client.publish(topic, payload);
  };

  const sub = ({ topic }) => {
    if (isConnected(client)) client.subscribe(topic);
  };
  const unsub = ({ topic }) => {
    if (isConnected(client)) client.unsubscribe(topic);
    client.unsubscribe(topic);
  };

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
      ...(protocol === "mqtts"
        ? {
            Socket: SecureSocket,
            secure: {
              protocolVersion: 0x0303,
              certificate: config.certificate,
              clientKey: config.clientKey,
              clientCertificates: config.clientCertificates,
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
    depends: ["network"],
  };
}
//export default connectToMQTT;

//import { loadAndInstantiate } from "modLoader";
//import bus from "bus";
import { measure } from "profiler";
import Mod from "mod-mqtt";
measure("MQTT load ");

const settings = Object.freeze({
  host: "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
  protocol: "mqtts",
  port: 443,
  certificate: "fctry://l/server.der",
  clientKey: "fctry://l/device.pk8",
  clientCertificates: ["fctry://l/device.der", "fctry://l/signer.der"],
  applicationLayerProtocolNegotiation: ["x-amzn-mqtt-ca"],
  traceSSL: false,
});

const bus = {
  emit(topic, payload) {
    self.postMessage([topic, payload]);
    measure("emit " + topic);
  },
};

export default function () {
  let mod = Mod({ bus, ...settings });
  mod.start();
  self.onmessage = ([topic, payload]) => {
    trace("message", topic, ",", JSON.stringify(payload), "\n");
    mod[topic](payload);
    measure("message " + topic);
  };
}

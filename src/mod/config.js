export default Object.freeze(
  {
    measure: {},
    pref: {},
    telnet: {
      port: 8023,
    },
    httpserver: {
      port: 80,
    },
    led: {
      pin: 2,
    },
    light: {
      pin: 10,
      mod: "mod-led",
      autostart: true,
    },
    button: {
      pin: 0,
      autostart: true,
    },
    wifista: {
      autostart: true,
    },
    wifiap: {},
    sntp: {
      hosts: "0.pool.ntp.org,1.pool.ntp.org,2.pool.ntp.org,3.pool.ntp.org",
    },
    mqtt: {
      host: "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
      protocol: "mqtts",
      port: 443,
      certificate: "fctry://l/server.der",
      clientKey: "fctry://l/device.pk8",
      clientCertificates: ["fctry://l/device.der", "fctry://l/ca.der"],
      applicationLayerProtocolNegotiation: ["x-amzn-mqtt-ca"],
    },
    ota: {
      url: "http://192.168.0.116:5000/hydrolec-host/xs_esp32.bin",
    },
    ble: {},
    //gui: {},
  },
  true
);

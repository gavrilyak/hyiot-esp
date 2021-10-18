export default Object.freeze(
  {
    measure: {},
    pref: {},
    telnet: {
      port: 8023,
    },
    httpserver: {
      port: 8080,
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
    wifista: {},
    wifiap: {},
    sntp: {
      hosts: "0.pool.ntp.org,1.pool.ntp.org,2.pool.ntp.org,3.pool.ntp.org",
    },
    mqtt: {
      //host: "10.1.10.207",
      //port: 1883,
      //clientId: "",
      //host: "a23tqp4io1iber-ats.iot.us-east-2.amazonaws.com",
      //protocol: "mqtts",
      //port: 443,
      //certificate: "fctry://l/server.der",
      //clientKey: "fctry://l/device.pk8",
      //clientCertificates: ["fctry://l/device.der"], //, "fctry://l/signer.der"],
      //applicationLayerProtocolNegotiation: ["x-amzn-mqtt-ca"],
      //traceSSL: true,
    },
    ota: {
      url: "http://192.168.0.116:5000/hydrolec-host/xs_esp32.bin",
    },
    ble: {},
    tz: {
      tz: "America/New_York",
    },
    serial: {
      port: 1,
      rx: 18,
      tx: 19,
      baud: 115200,
      //dataBits: 8,
      //parity: "n",
      //stopBits: 1,
      dataBits: 7,
      parity: "e",
      readLines: true,
      //stopBits: 1,
    },
    virtmodem: {
      mod: "mod-serial",
      port: 2,
      rx: 16,
      tx: 17,
      rxThreshold: 76,
      //readLines: true,
      extraEOL: 0x0d,
      //baud: 115200,
      //dataBits: 7,
      //parity: "e",
    },
    //gui: {},
  },
  true
);

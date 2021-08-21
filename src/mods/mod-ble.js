/*
 * Copyright (c) 2016-2020  Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 *
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>.
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */

import BLEClient from "bleclient";

function getFromAdv(b) {
  if (b[9] == 0xff && b[10] == 24) {
    let d = new DataView(b.buffer);
    let pressure = (b[11] + (b[12] >> 8) + (b[13] >> 16)) / 256;
    let temp = d.getUint16(14, true) / 256;
    let bat = b[16];
    return { pressure, temp, bat };
  }
}
export default function ({ bus }) {
  let scanner;
  function start() {
    class Scanner extends BLEClient {
      onReady() {
        this.startScanning({ duplicates: false });
        bus.emit("started");
      }
      onDiscovered(device) {
        let {
          address,
          scanResponse: { buffer, completeName },
        } = device;
        let measurement = getFromAdv(new Uint8Array(buffer));
        if (measurement) {
          bus.emit("nason", measurement);
        }
        if (completeName) {
          bus.emit("discovered", {
            address: "" + address,
            completeName,
          });
        }
      }
    }
    scanner = new Scanner();
  }

  function stop() {
    if (scanner) {
      scanner.close();
      scanner = null;
    }
    bus.emit("stopped");
  }
  return {
    start,
    stop,
  };
}

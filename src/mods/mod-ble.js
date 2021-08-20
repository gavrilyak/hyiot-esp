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

export default function ({ bus }) {
  let scanner;
  function start() {
    class Scanner extends BLEClient {
      onReady() {
        this.startScanning({ duplicates: false });
        bus.emit("started");
      }
      onDiscovered(device) {
        let scanResponse = device.scanResponse;
        let {completeName, completeUUID16List, incompleteUUID16List, manufacturerSpecific={}} = scanResponse;
	//const {identifier, data} = manufacturerSpecific;

	trace("MSP:",device.address, ":", new Uint8Array(scanResponse.buffer), "-", completeUUID16List, "-", incompleteUUID16List,"\n");
        if (completeName || manufacturerSpecific) {
          bus.emit("discovered", {
            address: "" + device.address,
            completeName,
	    manufacturerSpecific,
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

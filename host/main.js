/*
 * Copyright (c) 2016-2020 Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 *
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */

import Modules from "modules";

/*
let serial = new device.io.Serial({
  ...device.Serial.default,
  baud: 115200,
  port: 2,
  format: "buffer",
  onReadable: function(_count) {
    this.write(this.read());
  },
});
*/

export function print(msg) {
  trace(msg)
  //serial.write(ArrayBuffer.fromString(msg));
}


export default function () {
  print("HOST\n");
  if (!Modules.has("check") || !Modules.has("mod")) {
    print("WAITING FOR MOD\r\n");
    trace("Host installed. Ready for mods.\n");
    return;
  }
  print("IMPORTING MOD\r\n");
  Modules.importNow("check")();
  Modules.importNow("mod");
}

export function restart() @ "do_restart";
export function getBuildString	() @ "xs_getbuildstring";
export function modem	() @ "modem";


import Net from "net";
import { INVALID_REQUEST, JSON_OK } from "httpConsts";
import { Server } from "http";
import Timer from "timer";
import Time from "time";

import OTA from "esp32/ota";
import * as esp32 from "esp32";

export default function (PREFIX = "/api/ota") {
  /**
   * @type import("http").HTTPServerCallback
   */
  return function handler(message, value, method) {
    switch (message) {
      case Server.status:
        if (!value.startsWith(PREFIX)) return false;
        /**
         * @type import("esp32/ota").default
         */

        this.path = value;
        this.method = method;
        this.ota = new OTA();
        this.received = 0;
        this.startms = Time.ticks;
        this.total = 0;
        this.totalLength = 0;
        return true;

      case Server.headersComplete:
        this.totalLength = this.total;
        return true; //provide request body

      case Server.requestFragment:
        if (this.ota) {
          let bytes = this.read(ArrayBuffer);
          this.received += bytes.byteLength;
          this.ota.write(bytes);
          const newPercent =
            Math.round((10 * this.received) / this.totalLength) * 10;
          if (newPercent != this.percent) {
            this.percent = newPercent;
            trace("received ", this.percent, "%\n");
            // trace(
            //   `received ${bytes.byteLength}:${this.received} of ${this.totalLength}\n`
            // );
          }
        }
        break;

      case Server.requestComplete:
        if (this.ota) {
          trace(`before complete: ${Time.ticks}\n`);
          this.ota.complete();
          trace(
            `after complete: ${Time.ticks} - total ${
              Time.ticks - this.startms
            }\n`
          );
        }
        break;

      case Server.prepareResponse:
        if (this.ota) {
          trace("update complete, restart follows\n");
          Timer.set(() => {
            esp32.restart();
          }, 100);
          return JSON_OK;
        }
        return INVALID_REQUEST;
    }
  };
}

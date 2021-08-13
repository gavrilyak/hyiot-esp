/*
 * Copyright (c) 2019  Moddable Tech, Inc.
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

import { Request } from "http";
import OTA from "esp32/ota";
import Time from "time";

class OTARequest extends Request {
  constructor(url, response) {
    const schemeEnd = url.indexOf("://");
    const scheme = url.slice(0, schemeEnd);
    url = url.slice(schemeEnd + 3);
    const hostEnd = url.indexOf("/");

    const defaultPort = scheme == "https" ? 443 : 80;
    const [host, port = defaultPort] = url.slice(0, hostEnd).split(":");
    const path = url.slice(hostEnd);
    const dict = {
      host,
      port,
      path,
    };
    if (response) dict.response = response;
    super(dict);

    this.length = -1;
    this.received = 0;
    this.error = 0;
    this.startms = Time.ticks;
    this.ota = new OTA();
    this.percent = 0;
  }

  stop() {
    this.close();
    this.ota.cancel();
  }

  callback(message, value, v2) {
    switch (message) {
      case Request.status:
        if (200 !== value) {
          trace(`Error, unexpected HTTP response ${value}\n`);
          this.close();
          this.ota.cancel();
          this.error = value;
        }
        break;
      case Request.header:
        if ("content-length" === value) {
          this.length = parseInt(v2);
          trace(`Content-Length ${this.length} now: ${Time.ticks}\n`);
          trace(`after new OTA: ${Time.ticks}\n`);
        }
        break;
      case Request.headersComplete:
        if (!this.length) {
          trace(`Error: no Content-Length\n`);
          this.close();
        }
        break;
      case Request.responseFragment:
        {
          let bytes = this.read(ArrayBuffer);

          this.received += bytes.byteLength;
          this.ota.write(bytes);
          const newPercent =
            Math.round((10 * this.received) / this.length) * 10;
          if (newPercent != this.percent) {
            this.percent = newPercent;
            trace("received ", this.percent, "%\n");
            // trace(
            //   `received ${bytes.byteLength}:${this.received} of ${this.length}\n`
            // );
          }
        }
        break;
      case Request.responseComplete:
        trace(`before complete: ${Time.ticks}\n`);
        this.ota.complete();
        trace(
          `after complete: ${Time.ticks} - total ${Time.ticks - this.startms}\n`
        );
        if (undefined !== this.onFinished) this.onFinished();
        break;
      default:
        if (message < 0) {
          trace(`Error, ${message}\n`);
          this.close();
          this.ota.cancel();
          this.error = message;
        }
        break;
    }
  }
}

Object.freeze(OTARequest.prototype);

export default function ({ bus, ...config }) {
  let request;
  function start(params) {
    const url = config.url || params.url;
    if (url == null) bus.emit("error", "invalid url");
    request = new OTARequest(url);
    request.onFinished = () => {
      bus.emit("finished");
    };
    bus.emit("started");
  }

  function stop() {
    request?.stop();
    bus.emit("stopped");
  }

  return {
    start,
    stop,
  };
}

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

import { Server } from "http";
import Resource from "Resource";
import Net from "net";

const CONTENT_TYPES = {
  "/index.html": "text/html; charset=utf-8",
  "/preact.txt": "application/javascript; charset=utf-8",
  "/favicon.ico": "application/ico",
};

export default function ({ name, bus, port = 8080 } = {}) {
  let server = null;

  function start() {
    server = new Server({
      port,
    });
    server.callback = function (message, value, method) {
      switch (message) {
        case Server.status:
          bus.emit("log", { method, path: value });
          this.method = method;
          this.path = value === "/" && method === "GET" ? "/index.html" : value;
          break;

        case Server.prepareResponse:
          if (this.method === "GET") {
            const mayBeContentType = CONTENT_TYPES[this.path];
            if (mayBeContentType) {
              //we have this file, serve it from resource
              this.data = new Resource(`web${this.path}`);
              this.position = 0;
              return {
                headers: [
                  "Content-type",
                  mayBeContentType,
                  "Content-length",
                  this.data.byteLength,
                ],
                body: true,
              };
            }
          }
          return {
            status: 404,
            headers: ["Content-type", "text/plain"],
            body: "file not found",
          };

        case Server.responseFragment:
          if (this.position >= this.data.byteLength) return;

          const chunk = this.data.slice(this.position, this.position + value);
          this.position += chunk.byteLength;
          return chunk;
      }
    };

    bus.emit("started", { port, url: `http://${Net.get("IP")}:${port}` });
    trace(`{name} ready at http://${Net.get("IP")}:${port}/bartleby.txt\n`);
  }

  function stop() {
    server?.close();
    server = null;
  }

  return {
    start,
    stop,
    depends: ["network"],
  };
}

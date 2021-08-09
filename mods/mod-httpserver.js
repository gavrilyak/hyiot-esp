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
import WiFi from "wifi";
import pref from "preference";

const CONTENT_TYPES = {
  "/index.html": "text/html; charset=utf-8",
  "/preact.mjs": "text/javascript; charset=utf-8",
  "/index.mjs": "text/javascript; charset=utf-8",
  "/favicon.ico": "image/vnd.microsoft.icon",
};

const CONTENT_TYPE = "Content-type";
const APPLICATION_JSON = "application/json";
const TEXT_PLAIN = "text/plain";

const METHOD_NOT_ALLOWED = {
  status: 405,
  headers: [CONTENT_TYPE, TEXT_PLAIN],
  body: "Method not allowed",
};

const JSON_OK = {
  status: 200,
  headers: [CONTENT_TYPE, APPLICATION_JSON],
  body: `{"ok": true}`,
};

const handlers = {
  "/api/prefs": function prefs(path) {
    const ns = "mods";
    if (path === "" || path == "/") {
      switch (this.method) {
        case "GET": {
          const keys = pref.keys(ns);
          return {
            status: 200,
            headers: [CONTENT_TYPE, TEXT_PLAIN],
            body: JSON.stringify({ keys }),
          };
        }
        default:
          return METHOD_NOT_ALLOWED;
      }
    } else {
      const key = path.slice(1);
      switch (this.method) {
        case "GET": {
          const val = pref.get(ns, key);
          return {
            status: val ? 200 : 204,
            headers: [CONTENT_TYPE, TEXT_PLAIN],
            ...(val ? { body: val } : {}),
          };
        }
        case "PUT":
          pref.set(ns, key, this.requestBody);
          return JSON_OK;
        case "DELETE":
          pref.delete(ns, key);
          return JSON_OK;
        default:
          return METHOD_NOT_ALLOWED;
      }
    }
  },
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
          this.requestHeaders = [];
          this.method = method;
          this.path = value === "/" && method === "GET" ? "/index.html" : value;
          break;

        case Server.header: //one header received
          this.requestHeaders.push(value, method);

        case Server.headersComplete:
          return String; //receive body as string

        case Server.requestComplete:
          this.requestBody = value;
          break;

        case Server.prepareResponse:
          const handlerKey = Object.keys(handlers).find((k) =>
            this.path.startsWith(k)
          );
          if (handlerKey) {
            const handler = handlers[handlerKey];
            const path = this.path.slice(handlerKey.length);
            const handlerResult = handler.call(this, path);
            if (handlerResult) return handlerResult;
          }
          switch (this.path) {
            case "/api/status":
              switch (this.method) {
                case "GET":
                  return {
                    status: 200,
                    headers: [CONTENT_TYPE, APPLICATION_JSON],
                    body: JSON.stringify({
                      hello: "world",
                    }),
                  };
                default:
                  return METHOD_NOT_ALLOWED;
              }
            case "/api/network":
              switch (this.method) {
                case "GET":
                  return {
                    status: 200,
                    headers: [CONTENT_TYPE, APPLICATION_JSON],
                    body: JSON.stringify({
                      mac: Net.get("MAC"),
                      ip: Net.get("IP"),
                      wifi: {
                        ssid: Net.get("SSID"),
                        bssid: Net.get("BSSID"),
                        rssi: Net.get("RSSI"),
                        mode: WiFi.mode,
                      },
                    }),
                  };
                case "PUT":
                case "POST":
                  bus.emit("log", {
                    headers: this.requestHeaders,
                    body: this.requestBody,
                  });
                  return {
                    status: 200,
                    headers: [CONTENT_TYPE, APPLICATION_JSON],
                    body: `{"ok": true}`,
                  };
                default:
                  return METHOD_NOT_ALLOWED;
              }

            default:
              if (this.method === "GET") {
                const mayBeContentType = CONTENT_TYPES[this.path];
                if (mayBeContentType) {
                  //we have this file, serve it from resource
                  this.data = new Resource(`web${this.path}.gz`);
                  this.position = 0;
                  return {
                    headers: [
                      CONTENT_TYPE,
                      mayBeContentType,
                      "Content-length",
                      this.data.byteLength,
                      "Content-encoding",
                      "gzip",
                    ],
                    body: true,
                  };
                }
              }
          }
          return {
            status: 404,
            headers: [CONTENT_TYPE, "text/plain"],
            body: "Not found",
          };

        case Server.responseFragment:
          if (this.position >= this.data.byteLength) return;

          const chunk = this.data.slice(this.position, this.position + value);
          this.position += chunk.byteLength;
          return chunk;
      }
    };

    bus.emit("started", { port, url: `http://${Net.get("IP")}:${port}` });
    trace(`${name} ready at http://${Net.get("IP")}:${port}/\n`);
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

import { Server } from "http";
import Resource from "Resource";
import {
  CONTENT_TYPE,
  CONTENT_LENGTH,
  NOT_FOUND,
  TEXT_PLAIN,
} from "httpConsts";

const CONTENT_TYPES = {
  "/index.html": "text/html; charset=utf-8",
  "/preact.mjs": "text/javascript; charset=utf-8",
  "/index.mjs": "text/javascript; charset=utf-8",
  "/favicon.ico": "image/vnd.microsoft.icon",
};

export default function () {
  /**
   * @type import("http").HTTPServerCallback
   */
  return function (message, value, method) {
    switch (message) {
      case Server.status:
        this.method = method;
        this.path = value === "/" && method === "GET" ? "/index.html" : value;
        return true;

      case Server.header: //one header received
        break;

      case Server.headersComplete:
        return String; //receive body as string

      case Server.requestComplete:
        this.requestBody = value;
        break;

      case Server.prepareResponse:
        if (this.method === "GET") {
          const resourcePath = `web${this.path}`;
          const resourcePathGZ = `${resourcePath}.gz`;
          const exists = Resource.exists(resourcePathGZ)
            ? 2
            : Resource.exists(resourcePath)
            ? 1
            : 0;
          if (exists) {
            //we have this file, serve it from resource
            this.data = new Resource(
              exists === 2 ? resourcePathGZ : resourcePath
            );
            this.position = 0;
            const headers = [
              CONTENT_TYPE,
              CONTENT_TYPES[this.path] ?? TEXT_PLAIN,
              CONTENT_LENGTH,
              this.data.byteLength,
            ];
            if (exists === 2) headers.push("Content-encoding", "gzip");
            return {
              headers,
              body: true, //we will stream body
            };
          }
        }
        return NOT_FOUND;

      case Server.responseFragment: {
        if (this.position >= this.data.byteLength) return;

        const chunk = this.data.slice(this.position, this.position + value);
        this.position += chunk.byteLength;
        return chunk;
      }
    }
  };
}

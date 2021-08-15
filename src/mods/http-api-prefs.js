import { Server } from "http";
import pref from "preference";
import {
  CONTENT_TYPE,
  TEXT_PLAIN,
  METHOD_NOT_ALLOWED,
  INVALID_REQUEST,
  JSON_OK,
} from "httpConsts";

export default function (PREFIX = "/api/prefs") {
  /**
   * @type import("http").HTTPServerCallback
   */
  return function prefsHandler(message, value, method) {
    switch (message) {
      case Server.status:

      case Server.headersComplete:
        if (!value.startsWith(PREFIX)) return false;
        this.method = method;
        this.path = value.slice(PREFIX.length);
        return true;
        return String; //receive body as string

      case Server.requestComplete:
        this.requestBody = value;
        break;
      case Server.prepareResponse: {
        const [, ns, key] = this.path.split("/");
        trace(`NS ${ns}, KEY ${key}\n`);
        if (!ns) {
          switch (this.method) {
            case "GET": {
              //TODO - get it from modules list
              const keys = [
                "wifista",
                "wifiap",
                "mqtt",
                "led",
                "button",
                "telnet",
                "httpserver",
              ];
              return {
                status: 200,
                headers: [CONTENT_TYPE, TEXT_PLAIN],
                body: JSON.stringify({ keys }),
              };
            }
            default:
              return METHOD_NOT_ALLOWED;
          }
        }
        if (!key) {
          switch (this.method) {
            case "GET": {
              let result = {};
              for (const key of pref.keys(ns)) result[key] = pref.get(ns, key);
              return {
                status: 200,
                headers: [CONTENT_TYPE, TEXT_PLAIN],
                body: JSON.stringify(result),
              };
            }
            case "PUT": {
              try {
                const dict = JSON.parse(this.requestBody);
                for (const [k, v] of Object.entries(dict)) {
                  pref.set(ns, k, String(v));
                }
                return JSON_OK;
              } catch (e) {
                return INVALID_REQUEST;
              }
            }
            case "DELETE": {
              const keys = pref.keys(ns);
              for (const key of keys) {
                pref.delete(ns, key);
              }
              return JSON_OK;
            }
            default:
              return METHOD_NOT_ALLOWED;
          }
        } else {
          switch (this.method) {
            case "GET": {
              const val = pref.get(ns, key);
              return {
                status: val ? 200 : 204,
                headers: [CONTENT_TYPE, TEXT_PLAIN],
                body: String(val) || "",
              };
            }
            case "PUT":
              pref.set(ns, key, String(this.requestBody));
              return JSON_OK;
            case "DELETE":
              pref.delete(ns, key);
              return JSON_OK;
            default:
              return METHOD_NOT_ALLOWED;
          }
        }
      }
    }
  };
}

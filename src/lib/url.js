class URL {
  constructor(url) {
    this.parseHref(url);
  }

  parseHref(url) {
    //TODO this is totally naive and incorrect implementation for embedded
    const schemeEnd = url.indexOf("://");
    const scheme = url.slice(0, schemeEnd);
    url = url.slice(schemeEnd + 3);
    const hostEnd = url.indexOf("/");
    const [hostname, port] = url.slice(0, hostEnd).split(":");
    const pathname = url.slice(hostEnd);
    this.protocol = scheme + ":";
    this.hostname = hostname;
    this.port = port;
    this.pathname = pathname;
    //TODO
    this.search = "";
    this.hash = "";
    //this.search = (parsed && parsed[INDEX_SEARCH]) || "";
    //this.hash = (parsed && parsed[INDEX_HASH]) || "";
  }

  // @ts-ignore
  get href() {
    return `${this.origin}${this.pathname}${this.search}${this.hash}`;
  }

  // origin
  // @ts-ignore
  get origin() {
    return `${this.protocol}//${this.host}`;
  }

  // host
  // @ts-ignore
  get host() {
    return this.hostname + (this.port || "");
  }
}

globalThis.URL = URL;
Object.freeze(URL.constructor);
export default URL;

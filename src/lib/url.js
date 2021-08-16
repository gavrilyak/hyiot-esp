class URL {
  constructor(url) {
    this.parseHref(url);
  }

  parseHref(value) {
    const INDEX_PROTOCOL = 1;
    const INDEX_USERNAME = 2;
    const INDEX_PASSWORD = 3;
    const INDEX_HOSTNAME = 4;
    const INDEX_PORT = 5;
    const INDEX_PATHNAME = 6;
    const INDEX_SEARCH = 7;
    const INDEX_HASH = 8;
    const re =
      /(?:([a-z0-9]+:)?\/\/(?:([^:]*)(?::([^@]*))?@)?(?:([^/:]+)(?::(\d+))?))?([^?#]*)(\?[^#]*)?(#.*)?/i;

    const parsed = value.match(re);
    this.protocol = ((parsed && parsed[INDEX_PROTOCOL]) || "").toLowerCase();
    this.username = (parsed && parsed[INDEX_USERNAME]) || "";
    this.password = (parsed && parsed[INDEX_PASSWORD]) || "";
    this.hostname = (parsed && parsed[INDEX_HOSTNAME]) || "";
    this.port = ((parsed && parsed[INDEX_PORT]) || "").replace(/^0*/, "");
    this.pathname = (parsed && parsed[INDEX_PATHNAME]) || "/";
    this.search = (parsed && parsed[INDEX_SEARCH]) || "";
    this.hash = (parsed && parsed[INDEX_HASH]) || "";
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

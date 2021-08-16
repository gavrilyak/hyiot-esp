import URL from "url";
import Resourse from "Resource";
import Factory from "Factory";

export default function getBlob(urlStringOrBlob) {
  if (typeof urlStringOrBlob === "string") {
    const { protocol, pathname } = new URL(urlStringOrBlob);
    switch (protocol) {
      case "res:":
        return new Resourse(pathname.slice(1));
      case "fctry:":
        return Factory(pathname.slice(1));
      default:
        throw new Error(
          `Unsupported protocol ${protocol} in blob ${urlStringOrBlob}`
        );
    }
  } else {
    return urlStringOrBlob;
  }
}

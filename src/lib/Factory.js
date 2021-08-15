import getFileFromArchive from "getFileFromArchive";
import Modules from "modules";

let Fctry;
if (Modules.has("flash")) {
  const Flash = Modules.importNow("flash");
  const fctryPartition = new Flash("fctry");
  const buff = fctryPartition.map();
  Fctry = function Factory(name) {
    return getFileFromArchive(new Uint8Array(buff), name);
  };
} else {
  const Resource = Modules.importNow("Resource");
  Fctry = function (name) {
    return new Resource(name);
  };
}

export default Object.freeze(Fctry);

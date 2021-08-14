import getFileFromArchive from "getFileFromArchive";
import Flash from "flash";

const fctryPartition = new Flash("fctry");
const buff = fctryPartition.map();
function Factory(name) {
  return getFileFromArchive(new Uint8Array(buff), name);
}

export default Factory;

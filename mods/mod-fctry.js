import fctry from "fctry";
import Preference from "preference";

trace("FCTRY", fctry.keys("rmaker_creds"), "\n");

let node_id = fctry.get("rmaker_creds", "node_id");
if (node_id) {
  node_id = String.fromArrayBuffer(node_id);
  trace("FCTRY", node_id, "\n");
} else {
  trace("FCTRY - no node_id\n");
}

trace(Preference.keys("rmaker_creds"), "\n");
trace(Preference.get("rmaker_creds", "node_id"), "\n");

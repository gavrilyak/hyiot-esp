import { getMAC } from "native/esp32";

export default function getDefaultDeviceId() {
  return "HL1-" + getMAC().slice(-8).replaceAll(":", "");
}

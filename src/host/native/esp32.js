export function restart() @ "xs_do_restart";
export function getMacBin() @ "xs_getmac";

export function getMAC(staOrApString = "sta") {
  const isAp  = staOrApString === "ap";
  const isSta = staOrApString === "sta"
  if(!isSta && !isAp)
    throw Error("Invalid mode");
  const buff = isSta ? getMacBin(): getMacBin(1);
  return [...new Uint8Array(buff)]
      .map(x => x.toString(16).toUpperCase().padStart(2, '0'))
    .join(':');
}

export function set_wifi_ps(mode) @ "xs_set_wifi_ps";

export function restart() @ "xs_do_restart";
export function getBuildString	() @ "xs_getbuildstring";
function getMacBin() @ "xs_getmac";

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

export function setenv(name, value, override) @"xs_setenv";
export function getenv(name) @"xs_getenv";
export function tzset() @"xs_tzset";
export function localtime() @"xs_localtime";




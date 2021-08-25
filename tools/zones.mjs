import { readFileSync } from "fs";
import * as ini from "./inifile.mjs";

const zones = JSON.parse(readFileSync("./zones.json").toString());

let out = {};
for (let [k, v] of Object.entries(zones)) {
  const [pre, ...suf] = k.split("/");
  if (suf) {
    Object.assign((out[pre] = out[pre] || {}), { [suf.join("/")]: v });
  } else {
    out[k] = v;
  }
}

//console.log(JSON.stringify(out, null, 2));
function encodeIni(out) {
  const SP = " ";
  const EQ = "=";
  const CR = "\n";

  function encode(m) {
    return (
      Object.entries(m)
        .map(([k, v]) => k + EQ + v)
        .join(CR) + CR
    );
  }
  let zonesStr = [...Object.entries(out)]
    .map(([c, v]) => "[" + c + "]\n" + encode(v))
    .join(CR);
  return zonesStr;
}

//console.log(zonesStr);

String.fromArrayBuffer = function (b) {
  if (!(b instanceof ArrayBuffer)) throw Error("Must be array buffer");
  return Buffer.from(b).toString();
};

function findTZ(bin, name) {
  const [cont, ...city] = name.split("/");
  return ini.get(bin, cont, city.join("/"));
}

function test() {
  const zonesBin = Uint8Array.from(Buffer.from(zonesStr + "\n"));

  console.log(findTZ(zonesBin, "Africa/Abidjan"));
  console.log(findTZ(zonesBin, "Europe/Kiev"));
  console.log(findTZ(zonesBin, "America/New_York"));
  console.log(findTZ(zonesBin, "America/Indiana/Vincennes"));
  console.log(findTZ(zonesBin, "Pacific/Wallis"));
  console.log(findTZ(zonesBin, "some/shit"));

  for (const section of ini.sections(zonesBin)) {
    console.log(section);
  }
  for (const [k, v] of ini.entries(zonesBin, "Pacific")) {
    console.log(k, v);
  }
}

//test();
//console.log(JSON.stringify(out, null, 2));
console.log(encodeIni(out));

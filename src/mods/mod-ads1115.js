import Modules from "modules";
import Timer from "timer";
const START_CONVERSION = 0b1000000000000000
const MUX = {
  '0+1':   0b0000000000000000,
  '0+3':   0b0001000000000000,
  '1+3':   0b0010000000000000,
  '2+3':   0b0011000000000000,
  '0':     0b0100000000000000,
  '1':     0b0101000000000000,
  '2':     0b0110000000000000,
  '3':     0b0111000000000000
}


const addresses = [0x48, 0x49, 0x4A];
const pgaToVolts = [6.144, 4.096, 2.048, 1.024, 0.512, 0.256];
import SMBus from "pins/smbus";
export default function ({ bus, scl=22, sda=22 }) {
  let busy = 0;

  function start() {
    bus.emit("started");
  }
  function stop() {
    bus.emit("stopped");
  }

  function measure({ch = 0, delay = 10, gain = 1, divider=1250/16, round=10}={}) {
    const chip = Math.floor(ch / 4); //each chip has 4 chans
    const busyMask = 1 << chip;
    const chan = ch % 4;
    if(busy & busyMask) 
       return bus.emit("error", {"busy": chip})
    const address = addresses[chip];
    if(address == null) throw Error("ADC1115 Invalid channel " + ch);
    const i2c = new SMBus({ address });
    busy |= 1 << chip;
    const mux = MUX[chan];

    // No comparator | 1600 samples per second | single-shot mode
    //-------------C-mux-pga-S-sps-cmp
    const conf = 0b0_000_000_1_100_00011 | mux | ((gain & 0b111) << 9) | START_CONVERSION
    i2c.writeWord(1, conf , true);
    Timer.set(()=> {
      let result = i2c.readWord(0, true);
      i2c.close();
      busy &= ~busyMask;
      let v = Math.round(((result > 0x7FFF) ? (result - 0x10000)/0x8000 : result/0x7FFF) * pgaToVolts[gain] * divider * round) / round;
      bus.emit("measured", {ch, v, result})
    }, +delay);
 }

  return {
      start,
      stop,
      measure
  }
}
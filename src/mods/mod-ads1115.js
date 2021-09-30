import Modules from "modules";
import Timer from "timer";
import SMBus from "pins/smbus";

const PGA_TO_VOLTS = [6.144, 4.096, 2.048, 1.024, 0.512, 0.256];
const HZ = [8, 16, 32, 64, 128, 250, 475, 860];

export default function ({ bus, address = 0x48, interval = 20, offset=0 }) {
  let busy = false;
  let i2c = null;
  let ch = 0;
  let timer = null;
  let buf = new Uint8Array(2);
  let view = new DataView(buf.buffer)
  let values = [];
  let counter = 0;
  function start() {
    stop();
    i2c = new SMBus({ address });
    values = [];
    ch=0;
    measure(ch);
    timer = Timer.repeat(measureDone, interval);
    bus.emit("started");
  }

  function stop() {
    if (i2c) {
      i2c.close();
      i2c = null;
      if (timer) {
        Timer.clear(timer);
        timer = null;
      }
      bus.emit("stopped");
    }
  }


  function measureDone() {
    //trace("MEASURE DONE:", address, ",", ch, "\n");
    i2c.write(0, false);     // set address
    i2c.read(2, buf.buffer); // read two bytes into our buffer
    let v = Math.idiv(view.getInt16(0), 98);
    //let v = Math.round(((result > 0x7FFF) ? (result - 0x10000)/0x8000 : result/0x7FFF) * pgaToVolts[gain] * divider * round) / round;
    if (values[ch] != v) {
      values[ch] = v;
      bus.emit("changed", { ch: ch+offset, v });
    }
    //next timer;
    ch = (ch + 1) & 3;
    measure(ch);
  }

  function measure(ch) {
    //trace("MEASURE:", address, ",", ch, "\n");
    //const gain = 1, sps=7;
    //const  divider=1250/16, round=10
    //const delay = 2; //Math.ceil(1000/HZ[sps]) + 1;
    //---------C-D-ch-pga-M
    buf[0] = 0b1_1_00_001_1 | ((ch & 0b11)<< 4)
    //---------sps-compr
    buf[1] = 0b111_00011 ;
    i2c.write(1, buf);//buf[0], buf[1]); //conf1, conf2);
 }

  return {
      start,
      stop,
      measure
  }
}

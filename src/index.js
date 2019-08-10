import { Simulator, combine, risingEdge } from './logic/simulator';
import { toBinaryString } from './logic/util';
import { LEDArray, DIPSwitch, NotGate, Const, Clock } from './logic/components';
import render from './ui/render';

const simulator = new Simulator();

export class Register {
  constructor() {
    this._val = 0n;
    this._risingEdge = risingEdge();
  }

  run(clk, ce, ie, oe, data, datain) {
    if (this._risingEdge(clk)) {
      if (ce.high()) {
        ++this._val;
      }

      if (ie.high()) {
        this._val = datain ? datain.value() : data.value();
      }

      (this._onValueChange || _.noop)(this._val, data.width());
    }

    if (oe.high()) {
      data.write(this._val);
    }
  }

  onValueChange(func) {
    this._onValueChange = func;
  }
}

const Ram = content => class Ram {
  constructor() {
    this._content = content;
    this._risingEdge = risingEdge();
  }

  run(clk, addr, data, oe, ie) {
    if (this._risingEdge(clk)) {
      if (ie.high()) {
        this._content[addr.value()] = data.value();
      }
    }

    if (oe.high()) {
      data.write(this._content[addr.value()]);
    }

    (this._onValueChange || _.noop)(this._content, this._content[addr.value()]);
  }

  setContent(content) {
    this._content = content;
  }

  onValueChange(func) {
    this._onValueChange = func;
  }
}

const Rom = content => class Rom {
  constructor() {
    this._content = content;
    this._risingEdge = risingEdge();
  }

  run(clk, addr, data, oe) {
    const a = this._risingEdge(clk);
    if (a) {
      if (oe.high()) {
        if (addr.value() >= this._content.length) {
          throw new Error(`Rom out of bounds: ${toBinaryString(addr.value())}`)
        }

        data.write(this._content[addr.value()]);
      }
    }
  }
}

const BusTransceiver = (inp, out, oe) => {
  if (oe.high()) {
    out.write(inp.value());
  }
}

const LDA = 0x01n;

const PCCE  = (1n << 0n);
const PCIE  = (1n << 1n);
const PCOE  = (1n << 2n);
const MARIE = (1n << 3n);
const RAMOE = (1n << 4n);
const RAMIE = (1n << 5n);
const INSIE = (1n << 6n);
const AIE   = (1n << 7n);
const AOE   = (1n << 8n);
const INSOE = (1n << 9n);

const curom = _.fill(Array(32), 0n);
for (let n = 0; n < curom.length; ++n) {
  const step = n & 0b111;

  if (step === 0) {
    curom[n] = PCOE | MARIE;
  } else if (step === 1) {
    curom[n] = PCCE | RAMOE | INSIE;
  }
}

curom[(LDA << 3n) | 2n] = MARIE | INSOE;
curom[(LDA << 3n) | 3n] = RAMOE | AIE;

const ramc = _.fill(Array(16), 0n);
ramc[0] = (LDA << 4n) | 0xfn;
ramc[0xf] = 0xden;

const VCC = simulator.createWire(1);
simulator.registerComponent(Const(1n), VCC);

const GND = simulator.createWire(1);
simulator.registerComponent(Const(0n), GND);

const clk = simulator.createWire(1);
const clock = simulator.registerActiveComponent(Clock, clk);

const nclk = simulator.createWire(1);
simulator.registerComponent(NotGate, clk, nclk);

const bus = simulator.createWire(8);

const insbus = simulator.createWire(8);
const ccbus = simulator.createWire(3);
const ctrl = simulator.createWire(20);
const ins = simulator.registerComponent(Register, clk, GND, ctrl.splice(6), VCC, insbus, bus);
const cc = simulator.registerComponent(Register, clk, VCC, GND, VCC, ccbus);
const cu = simulator.registerComponent(Rom(curom), nclk, combine(insbus.splice(4, 4), ccbus), ctrl, VCC);
simulator.registerComponent(BusTransceiver, insbus.splice(0, 4), bus.splice(0, 4), ctrl.splice(9));

// const cu = simulator.registerActiveComponent(DIPSwitch, ctrl);

const pc = simulator.registerComponent(Register, clk, ctrl.splice(0), ctrl.splice(1), ctrl.splice(2), bus.splice(0, 4));

const areg = simulator.registerComponent(Register, clk, GND, ctrl.splice(7), ctrl.splice(8), bus);

const ramAddr = simulator.createWire(4);
const mar = simulator.registerComponent(Register, clk, GND, ctrl.splice(3), VCC, ramAddr, bus);
const ram = simulator.registerComponent(Ram(ramc), clk, ramAddr, bus, ctrl.splice(4), ctrl.splice(5));


// simulator.registerComponent(Const(1n), c1);
const dataled = simulator.registerComponent(LEDArray, bus);
const ctrlled = simulator.registerComponent(LEDArray, ctrl);
// const cled = simulator.registerComponent(LEDArray, c5);

// const s1 = simulator.registerActiveComponent(DIPSwitch, x);
// const s2 = simulator.registerActiveComponent(DIPSwitch, y);

render([
  [clock, 'Clock'],
  [pc, 'PC'],
  [areg, 'A'],
  [dataled, 'Bus'],
  [mar, 'MAR'],
  [ram, 'RAM'],
  [ins, 'INS'],
  [cc, 'CC'],
  [ctrlled, 'CTRL'],
]);

simulator.init();

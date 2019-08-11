import { Simulator, combine } from './logic/simulator';
import { toBinaryString } from './logic/util';
import {
  LEDArray,
  OrGate,
  NotGate,
  Const,
  Clock,
  Register,
  Ram,
  Rom,
  Comparator,
  BusTransceiver,
  SegDisplay,
  PushButton,
  DIPSwitch,
} from './logic/components';
import render from './ui/render';

const simulator = new Simulator();

const ALU = (xv, yv, s, flags, sub) => {
  let c = sub.high() ? 1n : 0n;
  const x = xv.value();
  const y = sub.high() ? ~yv.value() : yv.value();
  let res = 0n;
  for (let n = 0; n < xv.width(); ++n) {
    const xb = (x >> BigInt(n)) & 0x01n;
    const yb = (y >> BigInt(n)) & 0x01n;
    const r1 = xb ^ yb;
    const c1 = xb & yb;
    const r2 = r1 ^ c;
    const c2 = r1 & c;
    c = c1 | c2;
    res |= (r2 << BigInt(n));
  }
  s.write(res);
  flags.write((res === 0n ? 1n : 0n) << 1n | (c ? 1n : 0n));
}

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
const OIE   = (1n << 10n);
const BIE   = (1n << 11n);
const FOE   = (1n << 12n);
const ALUOE = (1n << 13n);
const HLTA  = (1n << 14n);
const SU    = (1n << 15n);

const curom = _.fill(Array(512), 0n);
for (let n = 0; n < curom.length; ++n) {
  const step = (n & 0b11100) >> 2;

  if (step === 0) {
    curom[n] = PCOE | MARIE;
  } else if (step === 1) {
    curom[n] = PCCE | RAMOE | INSIE;
  }
}

const cmd = (cmd, step, val) => {
  for (let n = 0n; n < 4n; ++n) {
    curom[(cmd << 5n) | (step << 2n) | n] = val;
  }
}

const NOP = 0x0n;
const LDA = 0x1n;
const ADD = 0x2n;
const SUB = 0x3n;
const STA = 0x4n;
const LDI = 0x5n;
const JMP = 0x6n;
const JC  = 0x7n;
const JZ  = 0x8n;
const OUT = 0xen;
const HLT = 0xfn;

cmd(LDA, 2n, MARIE | INSOE);
cmd(LDA, 3n, RAMOE | AIE);
cmd(ADD, 2n, MARIE | INSOE);
cmd(ADD, 3n, RAMOE | BIE);
cmd(ADD, 4n, ALUOE | AIE | FOE);
cmd(SUB, 2n, MARIE | INSOE);
cmd(SUB, 3n, RAMOE | BIE);
cmd(SUB, 4n, ALUOE | AIE | SU | FOE);
cmd(STA, 2n, MARIE | INSOE);
cmd(STA, 3n, RAMIE | AOE);
cmd(LDI, 2n, INSOE | AIE);
cmd(JMP, 2n, INSOE | PCIE);
curom[(JC << 5n) | (2n << 2n) | 0b01n] = curom[(JC << 5n) | (2n << 2n) | 0b11n] = INSOE | PCIE;
curom[(JZ << 5n) | (2n << 2n) | 0b10n] = curom[(JZ << 5n) | (2n << 2n) | 0b11n] = INSOE | PCIE;
cmd(OUT, 2n, AOE | OIE);
cmd(HLT, 2n, HLTA);

const ramc = _.fill(Array(16), 0n);
ramc[0]  = (LDA << 4n) | 14n;
ramc[1]  = (SUB << 4n) | 12n;
ramc[2]  = (JC  << 4n) | 6n;
ramc[3]  = (LDA << 4n) | 13n;
ramc[4]  = (OUT << 4n) | 0n;
ramc[5]  = (HLT << 4n) | 0n;
ramc[6]  = (STA << 4n) | 14n;
ramc[7]  = (LDA << 4n) | 13n;
ramc[8]  = (ADD << 4n) | 15n;
ramc[9]  = (STA << 4n) | 13n;
ramc[10] = (JMP << 4n) | 0n;

ramc[12] = 1n;
ramc[13] = 0n;
ramc[14] = 7n;
ramc[15] = 8n;

const VCC = simulator.createWire(1);
simulator.registerComponent(Const(1n), VCC);

const GND = simulator.createWire(1);
simulator.registerComponent(Const(0n), GND);

const ctrl = simulator.createWire(16);

const clksrc = simulator.createWire(1);
const clock = simulator.registerActiveComponent(Clock, clksrc);
const rst = simulator.createWire(1);
const rstButton = simulator.registerActiveComponent(PushButton, rst);

const nhlt = simulator.createWire(1);
simulator.registerComponent(NotGate, ctrl.splice(14), nhlt);
const clk = simulator.createWire(1);
simulator.registerComponent(BusTransceiver, clksrc, clk, nhlt);

const bus = simulator.createWire(8);

const flagsbus = simulator.createWire(2);
const insbus = simulator.createWire(8);
const ccbus = simulator.createWire(3);
const ins = simulator.registerComponent(Register, clk, GND, ctrl.splice(6), VCC, rst, insbus, bus);
const ccmax = simulator.createWire(3);
simulator.registerComponent(Const(0b101n), ccmax);
const ccismax = simulator.createWire(1);
simulator.registerComponent(Comparator, ccmax, ccbus, ccismax);
const ccrst = simulator.createWire(1);
simulator.registerComponent(OrGate, ccismax, rst, ccrst);
const cc = simulator.registerComponent(Register, clk, VCC, GND, VCC, ccrst, ccbus);
const cu = simulator.registerComponent(Rom(curom), combine(insbus.splice(4, 4), ccbus, flagsbus), ctrl, VCC);
simulator.registerComponent(BusTransceiver, combine(GND, GND, GND, GND, insbus.splice(0, 4)), bus, ctrl.splice(9));

const pc = simulator.registerComponent(Register, clk, ctrl.splice(0), ctrl.splice(1), ctrl.splice(2), rst, bus.splice(0, 4));

const abus = simulator.createWire(8);
const areg = simulator.registerComponent(Register, clk, GND, ctrl.splice(7), VCC, rst, abus, bus);
simulator.registerComponent(BusTransceiver, abus, bus, ctrl.splice(8));
const bbus = simulator.createWire(8);
const breg = simulator.registerComponent(Register, clk, GND, ctrl.splice(11), VCC, rst, bbus, bus);

const alubus = simulator.createWire(8);
const alutoflags = simulator.createWire(2);
simulator.registerComponent(ALU, abus, bbus, alubus, alutoflags, ctrl.splice(15));
simulator.registerComponent(BusTransceiver, alubus, bus, ctrl.splice(13));
const flags = simulator.registerComponent(Register, clk, GND, ctrl.splice(12), VCC, rst, flagsbus, alutoflags);

const ramAddr = simulator.createWire(4);
const mar = simulator.registerComponent(Register, clk, GND, ctrl.splice(3), VCC, rst, ramAddr, bus);
const ram = simulator.registerComponent(Ram(ramc), clk, ramAddr, bus, ctrl.splice(4), ctrl.splice(5));

const sseg = simulator.registerComponent(SegDisplay, clk, ctrl.splice(10), bus, rst);

const dataled = simulator.registerComponent(LEDArray, bus);
const ctrlled = simulator.registerComponent(LEDArray, ctrl);
const aluled = simulator.registerComponent(LEDArray, alubus);
const flagsled = simulator.registerComponent(LEDArray, alutoflags);

render([
  [
    [clock, 'Clock'],
    [mar, 'MAR'],
    [ram, 'RAM'],
    [ins, 'INS'],
    [cc, 'CC', 'green'],
    [ctrlled, 'CTRL', 'blue'],
    [rstButton, 'Reset'],
  ], [
    [dataled, 'Bus'],
    [pc, 'PC', 'green'],
    [areg, 'A'],
    [aluled, 'ALU'],
    [breg, 'B'],
    [flagsled, 'FLAGS'],
    [sseg, 'OUT', 3, 'dec'],
  ]
]);

simulator.init();

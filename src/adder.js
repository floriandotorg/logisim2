import { Simulator } from './logic/simulator';
import { toBinaryString } from './logic/util';
import { LEDArray, DIPSwitch, XorGate, AndGate, OrGate, Const } from './logic/components';
import render from './ui/render';

const simulator = new Simulator();

const HalfAdder = (x, y, s, c) => {
  simulator.registerComponent(XorGate, x, y, s);
  simulator.registerComponent(AndGate, x, y, c);
}

const FullAdder = (x, y, cin, s, cout) => {
  const s1 = simulator.createWire(1);
  const c1 = simulator.createWire(1);
  const c2 = simulator.createWire(1);
  HalfAdder(x, y, s1, c1);
  HalfAdder(s1, cin, s, c2);
  simulator.registerComponent(OrGate, c1, c2, cout);
}

const x = simulator.createWire(4);
const y = simulator.createWire(4);
const s = simulator.createWire(4);

const c1 = simulator.createWire(1);
const c2 = simulator.createWire(1);
const c3 = simulator.createWire(1);
const c4 = simulator.createWire(1);
const c5 = simulator.createWire(1);

FullAdder(x.splice(0), y.splice(0), c1, s.splice(0), c2);
FullAdder(x.splice(1), y.splice(1), c2, s.splice(1), c3);
FullAdder(x.splice(2), y.splice(2), c3, s.splice(2), c4);
FullAdder(x.splice(3), y.splice(3), c4, s.splice(3), c5);

simulator.registerComponent(Const(1n), c1);
const sled = simulator.registerComponent(LEDArray, s);
const cled = simulator.registerComponent(LEDArray, c5);

const s1 = simulator.registerActiveComponent(DIPSwitch, x);
const s2 = simulator.registerActiveComponent(DIPSwitch, y);

render([
  [s1, 'X'],
  [s2, 'Y'],
  [sled, 'S'],
  [cled, 'C'],
]);

simulator.init();

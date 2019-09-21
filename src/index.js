import { Simulator, combine } from './logic/simulator';
import { toBinaryString } from './logic/util';
import {
  Const,
  Rom,
  Register,
  LEDArray,
  Clock,
  DIPSwitch,
} from './logic/components';
import Hd44780Lcd from './logic/Hd44780_lcd';
import render from './ui/render';

const simulator = new Simulator();

const cmds = [
  0b0000000000n,

  // display/cursor on
  0b0000001111n,

  // 4 bit mode
  0b0000100100n,
  0b0000000000n,
  0b0000010000n,
  0b0000110000n,
  0b0001000000n,

  // write ABC
  0b0000000110n,
  0b0000010000n,
  0b1001000001n,
  0b1001000001n + 1n,
  0b1001000001n + 2n,

  // shift left
  0b0000011100n,

  // two lines mode
  0b0000111100n,
  0b0011000000n,
  0b1001000001n,

  0x0n, 0x0n, 0x0n, 0x0n
]

const VCC = simulator.createWire(1);
simulator.registerComponent(Const(1n), VCC);

const GND = simulator.createWire(1);
simulator.registerComponent(Const(0n), GND);

// const rs = simulator.createWire(1);
// const rw = simulator.createWire(1);
const clk = simulator.createWire(1);
const data = simulator.createWire(10);
const addr = simulator.createWire(10);

// const rsSwitch = simulator.registerActiveComponent(DIPSwitch, rs);
// const rwSwitch = simulator.registerActiveComponent(DIPSwitch, rw);
// const dataSwitch = simulator.registerActiveComponent(DIPSwitch, data);
const clock = simulator.registerActiveComponent(Clock, clk);

simulator.registerComponent(Register, clk, VCC, GND, VCC, GND, addr);
simulator.registerComponent(Rom(cmds), addr, data, VCC);

const lcd = simulator.registerComponent(Hd44780Lcd(8, 2), data.splice(9), data.splice(8), clk, data.splice(0, 8));
const led = simulator.registerComponent(LEDArray, data);

render([[
  [clock, 'Clock'],
  // [rsSwitch, 'RS'],
  // [rwSwitch, 'RW'],
  // [dataSwitch, 'Data'],
  [led, 'Data'],
], [
  [lcd, 'Display'],
]]);

simulator.init();

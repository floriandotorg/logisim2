import { risingEdge } from './util';

export class Clock {
  constructor(update, hlt) {
    this._update = update;
  }

  setHigh() {
    this._update(1n);
  }

  setLow() {
    this._update(0n);
  }

  tick() {
    this.setHigh();
    this.setLow();
  }
}

export class DIPSwitch {
  constructor(update, wire) {
    this._update = update;
    this._width = wire.width();
  }

  set(val) {
    this._update(val);
  }

  width() {
    return this._width;
  }
}

export class PushButton {
  constructor(update) {
    this._update = update;
  }

  setHigh() {
    this._update(1n);
  }

  setLow() {
    this._update(0n);
  }
}

export const AndGate = (i1, i2, out) => {
  out.write(i1.value() & i2.value());
}

export const OrGate = (i1, i2, out) => {
  out.write(i1.value() | i2.value());
}

export const XorGate = (i1, i2, out) => {
  out.write(i1.value() ^ i2.value());
}

export const NotGate = (i, out) => {
  out.write(~ i.value());
}

export const Const = val => out => {
  out.write(val);
}

export class LEDArray {
  run(i) {
    (this._onValueChange || _.noop)(i.value(), i.width());
  }

  onValueChange(func) {
    this._onValueChange = func;
  }
}

export class SegDisplay {
  constructor() {
    this._val = 0n;
    this._risingEdge = risingEdge();
  }

  run(clk, ie, inp, rst) {
    if (this._risingEdge(clk)) {
      if (ie.high()) {
        this._val = inp.value();
      }
    }

    if (rst.high()) {
      this._val = 0n;
    }

    (this._onValueChange || _.noop)(this._val);
  }

  onValueChange(func) {
    this._onValueChange = func;
  }
}

export class Register {
  constructor() {
    this._val = 0n;
    this._risingEdge = risingEdge();
  }

  run(clk, ce, ie, oe, rst, data, datain) {
    if (this._risingEdge(clk)) {
      if (ce.high()) {
        ++this._val;
      }

      if (ie.high()) {
        this._val = datain ? datain.value() : data.value();
      }
    }

    if (rst.high()) {
      this._val = 0n;
    }

    if (oe.high()) {
      data.write(this._val);
    }

    (this._onValueChange || _.noop)(this._val, data.width());
  }

  onValueChange(func) {
    this._onValueChange = func;
  }
}

export const Ram = content => class Ram {
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

export const Rom = content => class Rom {
  constructor() {
    this._content = content;
    this._risingEdge = risingEdge();
  }

  run(addr, data, oe) {
    if (oe.high()) {
      if (addr.value() >= this._content.length) {
        throw new Error(`Rom out of bounds: ${toBinaryString(addr.value())}`)
      }

      data.write(this._content[addr.value()]);
    }
  }
}

export const BusTransceiver = (inp, out, oe) => {
  if (oe.high()) {
    out.write(inp.value());
  }
}

export const Comparator = (val, inp, equ) => {
  equ.write(val.value() === inp.value() ? 1n : 0n);
}

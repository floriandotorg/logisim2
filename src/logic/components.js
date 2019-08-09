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

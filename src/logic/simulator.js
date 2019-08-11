import isClass from 'is-class';

const maskFirstNBits = num => {
  let result = 0n;
  for (let n = 0n; n < num; ++n) {
    result |= 1n << n;
  }
  return result;
};

class SplicedWire {
  constructor(parent, start, n) {
    this._parent = parent;
    this._start = BigInt(start);
    this._width = n;
    this._mask = maskFirstNBits(n) << this._start;
  }

  value() {
    return (this._parent.value() & this._mask) >> this._start;
  }

  width() {
    return this._width;
  }

  write(value) {
    const pval = this._parent.value() & ~this._mask;
    this._parent.write(pval | ((value << this._start) & this._mask), true);
  }

  high() {
    if (this.width() !== 1) {
      throw new Error('high called on wire with width > 0');
    }

    return !!this.value();
  }
}

class Wire {
  constructor(width) {
    this._currentValue = 0n;
    this._newValue = null;
    this._width = width;
    this._children = [];
    this._mask = maskFirstNBits(this._width);
  }

  write(value, fromChild) {
    if (!fromChild && this._newValue !== null) {
      throw new Error('double write');
    }

    value &= this._mask;

    if (value !== this._currentValue) {
      this._newValue = value;
    }
  }

  reset() {
    this._currentValue = 0n;
    this._newValue = null;
  }

  update() {
    if (this._newValue !== null) {
      this._currentValue = this._newValue;
      this._newValue = null;
      return true;
    }

    return false;
  }

  value() {
    return this._currentValue;
  }

  width() {
    return this._width;
  }

  splice(start, n = 1) {
    if (this.width() < start + n) {
      throw new Error('splice too far');
    }

    this._children.push(new SplicedWire(this, start, n));
    return _.last(this._children);
  }

  high() {
    if (this.width() !== 1) {
      throw new Error('high called on wire with width > 0');
    }

    return !!this.value();
  }
}

class CombinedWire {
  constructor(parents) {
    this._parents = _.reverse(parents);
    this._width = _.reduce(this._parents, (w, p) => w + p.width(), 0);
  }

  value() {
    let n = 0, result = 0n;

    for (let p of this._parents) {
      result |= p.value() << BigInt(n);
      n += p.width();
    }

    return result;
  }

  width() {
    return this._width;
  }
}

export const combine = (...wires) => {
  return new CombinedWire(wires);
}

export class Simulator {
  constructor() {
    this._components = [];
    this._wires = [];
  }

  createWire(width) {
    this._wires.push(new Wire(width));
    return _.last(this._wires);
  }

  registerComponent(component, ...wires) {
    if (!isClass(component)) {
      this._components.push({component, wires});
    } else {
      const instance = new component();
      this._components.push({component: instance.run.bind(instance), wires});
      return instance;
    }
  }

  registerActiveComponent(Component, ...wires) {
    const update = (...values) => {
      for (let n in wires) {
        wires[n].write(values[n]);
      }

      _.invokeMap(this._wires, 'update');

      this.tick();
    }

    return new Component(update, ...wires);
  }

  tick() {
    let n = 0;
    do {
      _.each(this._components, ({component, wires}) => {
        component(...wires);
      });
      if (++n > 100) {
        throw new Error('endless loop');
      }
    } while (_.filter(this._wires, wire => wire.update()).length > 0);

  }

  init() {
    this.tick();
  }
}

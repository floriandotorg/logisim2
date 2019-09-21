import _ from 'lodash';
import { fallingEdge } from './util';

export default (w, h) => class Hd44780Lcd {
  constructor() {
    this._fallingEdge = fallingEdge();
    this._state = {
      ram: _.range(0x68).map(() => _.random(0, 255)),
      curaddr: BigInt(_.random(0, 79)),
      curinc: true,
      shiftOnWrite: false,
      shift: 0n,
      display: false,
      cursor: false,
      blink: false,
      fourBitMode: false,
      twoLines: false,
      fourBitBuf: null,
    }
  }

  size() {
    return {w, h};
  }

  onStateChange(onStateChange) {
    this._onStateChange = onStateChange;
  }

  run(rs, rw, clk, data) {
    if (this._fallingEdge(clk)) {
      let dataval = data.value();

      if (this._state.fourBitMode) {
        if (this._state.fourBitBuf !== null) {
          dataval = (this._state.fourBitBuf << 4n) | ((dataval & 0xf0n) >> 4n);
          this._state.fourBitBuf = null;
        } else {
          return this._state.fourBitBuf = (dataval & 0xf0n) >> 4n;
        }
      }

      const cropAddr = (curaddr, negative = false) => {
        if (this._state.twoLines) {
          if (curaddr > 0x27n && curaddr < 0x40n) {
            return 0x40n;
          } else if (curaddr > 0x67n) {
            return 0x00n;
          } else if (!negative && curaddr < 0x00n) {
            return 0x68n + curaddr;
          }
        } else {
          if (curaddr > 0x4fn) {
            return 0x00n;
          } else if (!negative && curaddr < 0x00n) {
            return 0x50n + curaddr;
          }
        }

        return curaddr;
      }

      if (rs.low()) {
        if (rw.low()) {
          // clear display
          if (dataval === 0x01n) {
            this._state = {
              ...this._state,
              ram: _.fill(this._state.ram, 32),
              curaddr: 0n,
              shift: 0n,
            };
          // cursor home
          } else if ((dataval & 0b11111110n) === 0b10n) {
            this._state.curaddr = 0n;
          // entry mode set
          } else if ((dataval & 0b11111100n) === 0b100n) {
            this._state = {
              ...this._state,
              curinc: !!(dataval & 0x02n),
              shiftOnWrite: !!(dataval & 0x01n),
            };
          // function set
          } else if ((dataval & 0b11100000n) === 0b00100000n) {
            if (!(dataval & 0b00000100n)) {
              throw new Error('5x8 not implemented');
            }
            this._state = {
              ...this._state,
              fourBitMode: !(dataval & 0b00010000n),
              twoLines: !!(dataval & 0b00001000n),
            };
          // cursor/shift display
          } else if ((dataval & 0b11110000n) === 0b10000n) {
            if (dataval & 0b1000n) {
              this._state = {
                ...this._state,
                shift: cropAddr(this._state.shift + (dataval & 0b100n ? -1n : 1n), true),
              };
            } else {
              this._state = {
                ...this._state,
                curaddr: cropAddr(this._state.curaddr + (dataval & 0b100n ? 1n : -1n)),
              };
            }
          // set ddram addr
          } else if ((dataval & 0b10000000n) === 0b10000000n) {
            this._state = {
              ...this._state,
              curaddr: cropAddr(dataval & 0b01111111n),
            };
          // display on/off control
          } else if ((dataval & 0b11111000n) === 0b1000n) {
            this._state = {
              ...this._state,
              display: !!(dataval & 0b100n),
              cursor: !!(dataval & 0b010n),
              blink: !!(dataval & 0b001n),
            };
          }
        }
      } else {
        if (rw.low()) {
          const ram = this._state.ram;
          ram[this._state.curaddr] = dataval;
          this._state = {
            ...this._state,
            ram,
            curaddr: this._state.shiftOnWrite ? this._state.curaddr : cropAddr(this._state.curaddr + (this._state.curinc ? 1n : -1n)),
            shift: this._state.shiftOnWrite ? cropAddr(this._state.shift + 1n, true) : this._state.shift,
          };
        } else {
          throw new Error('reading is not implemented');
        }
      }

      this._onStateChange(this._state);
    }
  }
}

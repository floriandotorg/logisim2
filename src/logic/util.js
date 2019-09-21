export const toBinaryString = (value, width = 32) => {
  const output = [];

  for (let n = 0n; n < width; ++n) {
    output.unshift(value & (1n << n) ? 1 : 0);
  }

  return output.join('');
}

export const risingEdge = () => {
  let state = 0n;

  return wire => {
    const result = !state && !!wire.value();
    state = wire.value();
    return result;
  }
}

export const fallingEdge = () => {
  let state = 1n;

  return wire => {
    const result = !!state && !wire.value();
    state = wire.value();
    return result;
  }
}

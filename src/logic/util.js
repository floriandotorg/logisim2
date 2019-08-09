export const toBinaryString = (value, width = 32) => {
  const output = [];

  for (let n = 0n; n < width; ++n) {
    output.unshift(value & (1n << n) ? 1 : 0);
  }

  return output.join('');
}

/** Fractional powers use the principal complex argument in [-pi, pi]. */
export function normalizeMultibrotPower(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(8, Math.max(2, value)) : 3;
}

export function multibrotPower(real: number, imaginary: number, power: number): [number, number] {
  if (Number.isInteger(power)) {
    let re = real;
    let im = imaginary;
    for (let exponent = 1; exponent < power; exponent += 1) {
      [re, im] = [re * real - im * imaginary, re * imaginary + im * real];
    }
    return [re, im];
  }
  const radius = Math.hypot(real, imaginary);
  if (radius === 0) return [0, 0];
  const angle = Math.atan2(imaginary === 0 ? 0 : imaginary, real) * power;
  const magnitude = Math.pow(radius, power);
  return [magnitude * Math.cos(angle), magnitude * Math.sin(angle)];
}

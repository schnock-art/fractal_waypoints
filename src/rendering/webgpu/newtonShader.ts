/** Convergence metrics: status (0 unresolved, 1 converged, 2 singular, 3 diverged), root, residual, steps. */
export const newtonShader = /* wgsl */ `
fn ds_divide(a: vec2f, b: vec2f) -> vec2f {
  let quotient = a.x / b.x;
  let remainder = ds_sub(a, ds_mul_f32(b, quotient));
  return ds_add(vec2f(quotient, 0.0), vec2f((remainder.x + remainder.y) / b.x, 0.0));
}

fn polynomial_value(z: DsComplex) -> DsComplex {
  let powered = multibrot_power(z, render.newton.x);
  return DsComplex(ds_sub(powered.re, render.polynomial.xy), ds_sub(powered.im, render.polynomial.zw));
}

fn iterate_newton(point: DsComplex, limit: u32, nova: bool) -> OrbitMetrics {
  var z = point;
  if (nova) {
    z = DsComplex(vec2f(render.newton.w * cos(render.detail.z), 0.0), vec2f(render.newton.w * sin(render.detail.z), 0.0));
  }
  var iteration = 0u;
  var status = 0.0;
  var residual = 0.0;
  loop {
    if (iteration >= limit) { break; }
    let f = polynomial_value(z);
    residual = sqrt(max(ds_to_f32(ds_complex_abs_square(f)), 0.0));
    if (!nova && residual <= render.newton.z) { status = 1.0; break; }
    let powered = multibrot_power(z, render.newton.x - 1.0);
    let derivative = DsComplex(ds_mul_f32(powered.re, render.newton.x), ds_mul_f32(powered.im, render.newton.x));
    let denominator = ds_complex_abs_square(derivative);
    if (ds_to_f32(denominator) < 1e-20) { status = 2.0; break; }
    let quotient = DsComplex(
      ds_divide(ds_add(ds_mul(f.re, derivative.re), ds_mul(f.im, derivative.im)), denominator),
      ds_divide(ds_sub(ds_mul(f.im, derivative.re), ds_mul(f.re, derivative.im)), denominator));
    var step = DsComplex(ds_mul_f32(quotient.re, -render.newton.y), ds_mul_f32(quotient.im, -render.newton.y));
    if (nova) { step = ds_complex_add(step, point); }
    let next = ds_complex_add(z, step);
    let length_squared = ds_to_f32(ds_complex_abs_square(next));
    if (!(length_squared <= 1e6)) { status = 3.0; break; }
    z = next;
    iteration += 1u;
    if (nova) {
      residual = sqrt(max(ds_to_f32(ds_complex_abs_square(step)), 0.0));
      if (residual <= render.newton.z) { status = 1.0; break; }
    }
  }
  if (!nova) {
    residual = sqrt(max(ds_to_f32(ds_complex_abs_square(polynomial_value(z))), 0.0));
    if (status == 0.0 && residual <= render.newton.z) { status = 1.0; }
  }
  var root = -1.0;
  if (!nova && status == 1.0) {
    var nearest = 1e9;
    var second = 1e9;
    for (var index = 0u; index < u32(render.newton.x); index += 1u) {
      let angle = render.detail.z + 6.28318530718 * f32(index) / render.newton.x;
      let distance = length(vec2f(ds_to_f32(z.re), ds_to_f32(z.im)) - render.newton.w * vec2f(cos(angle), sin(angle)));
      if (distance < nearest) { second = nearest; nearest = distance; root = f32(index); }
      else { second = min(second, distance); }
    }
    if (nearest >= 0.01 || second <= nearest * 2.0) { root = -1.0; }
  }
  return OrbitMetrics(status == 3.0, iteration, ds_to_f32(ds_complex_abs_square(z)), orbit_phase(z), 1e9, 1e9, z, vec4f(status, root, residual, f32(iteration)));
}
`;

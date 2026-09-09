export const mandelbrotShader = /* wgsl */ `
struct RenderUniforms {
  centre: vec4f,
  viewport: vec4f,
  julia: vec4f,
  control: vec4f,
  colouring: vec4f,
  extras: vec4f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
}

struct DsComplex {
  re: vec2f,
  im: vec2f,
}

@group(0) @binding(0) var<uniform> render: RenderUniforms;
@group(0) @binding(1) var paletteSampler: sampler;
@group(0) @binding(2) var paletteTexture: texture_2d<f32>;

fn quick_two_sum(a: f32, b: f32) -> vec2f {
  let s = a + b;
  return vec2f(s, b - (s - a));
}

fn two_sum(a: f32, b: f32) -> vec2f {
  let s = a + b;
  let bb = s - a;
  let err = (a - (s - bb)) + (b - bb);
  return vec2f(s, err);
}

fn split(a: f32) -> vec2f {
  let c = 4097.0 * a;
  let hi = c - (c - a);
  let lo = a - hi;
  return vec2f(hi, lo);
}

fn two_prod(a: f32, b: f32) -> vec2f {
  let p = a * b;
  let a_parts = split(a);
  let b_parts = split(b);
  let err = ((a_parts.x * b_parts.x - p) + (a_parts.x * b_parts.y) + (a_parts.y * b_parts.x)) + (a_parts.y * b_parts.y);
  return vec2f(p, err);
}

fn ds_normalize(value: vec2f) -> vec2f {
  return quick_two_sum(value.x, value.y);
}

fn ds_add(a: vec2f, b: vec2f) -> vec2f {
  let s = two_sum(a.x, b.x);
  return ds_normalize(vec2f(s.x, s.y + a.y + b.y));
}

fn ds_sub(a: vec2f, b: vec2f) -> vec2f {
  return ds_add(a, vec2f(-b.x, -b.y));
}

fn ds_mul(a: vec2f, b: vec2f) -> vec2f {
  let p = two_prod(a.x, b.x);
  return ds_normalize(vec2f(p.x, p.y + a.x * b.y + a.y * b.x + a.y * b.y));
}

fn ds_mul_f32(a: vec2f, b: f32) -> vec2f {
  let p = two_prod(a.x, b);
  return ds_normalize(vec2f(p.x, p.y + a.y * b));
}

fn ds_to_f32(value: vec2f) -> f32 {
  return value.x + value.y;
}

fn ds_complex_add(a: DsComplex, b: DsComplex) -> DsComplex {
  return DsComplex(ds_add(a.re, b.re), ds_add(a.im, b.im));
}

fn ds_complex_square(value: DsComplex) -> DsComplex {
  let real = ds_sub(ds_mul(value.re, value.re), ds_mul(value.im, value.im));
  let imaginary = ds_mul_f32(ds_mul(value.re, value.im), 2.0);
  return DsComplex(real, imaginary);
}

fn ds_complex_burning_ship_square(value: DsComplex) -> DsComplex {
  let abs_re = vec2f(abs(ds_to_f32(value.re)), 0.0);
  let abs_im = vec2f(abs(ds_to_f32(value.im)), 0.0);
  let real = ds_sub(ds_mul(abs_re, abs_re), ds_mul(abs_im, abs_im));
  let imaginary = ds_mul_f32(ds_mul(abs_re, abs_im), 2.0);
  return DsComplex(real, imaginary);
}

fn ds_complex_tricorn_square(value: DsComplex) -> DsComplex {
  let real = ds_sub(ds_mul(value.re, value.re), ds_mul(value.im, value.im));
  let imaginary = ds_mul_f32(ds_mul(value.re, value.im), -2.0);
  return DsComplex(real, imaginary);
}

fn ds_complex_abs_square(value: DsComplex) -> vec2f {
  return ds_add(ds_mul(value.re, value.re), ds_mul(value.im, value.im));
}

fn trap_distance(value: DsComplex) -> f32 {
  let real = ds_to_f32(value.re);
  let imaginary = ds_to_f32(value.im);
  let radial = abs(length(vec2f(real, imaginary)) - 0.5);
  let cross = min(abs(real), abs(imaginary));
  return min(radial, cross);
}

fn clamp_unit(value: f32) -> f32 {
  return clamp(value, 0.0, 1.0);
}

fn orbit_trap_signal(min_trap_distance: f32, trap_scale: f32) -> f32 {
  let safe_scale = max(trap_scale, 0.05);
  return 1.0 / (1.0 + max(min_trap_distance, 0.0) * safe_scale * 12.0);
}

fn orbit_trap_palette_t(min_trap_distance: f32, density: f32, trap_scale: f32) -> f32 {
  return fract(orbit_trap_signal(min_trap_distance, trap_scale) * max(density, 0.0001) * 24.0);
}

fn orbit_trap_exterior_mix(normalized_iterations: f32, min_trap_distance: f32, trap_scale: f32) -> f32 {
  let boundary_bias = clamp_unit(normalized_iterations);
  let trap_bias = orbit_trap_signal(min_trap_distance, trap_scale);
  return clamp_unit(0.18 + boundary_bias * 0.30 + trap_bias * 0.18);
}

fn orbit_trap_interior_mix(min_trap_distance: f32, trap_scale: f32) -> f32 {
  return clamp_unit(0.22 + orbit_trap_signal(min_trap_distance, trap_scale) * 0.42);
}

fn blend_rgb(left: vec3f, right: vec3f, mix: f32) -> vec3f {
  let t = clamp_unit(mix);
  return left + ((right - left) * t);
}

fn rotate_point(point: vec2f) -> vec2f {
  let cosine = render.viewport.z;
  let sine = render.viewport.w;
  return vec2f(
    point.x * cosine - point.y * sine,
    point.x * sine + point.y * cosine,
  );
}

fn pixel_to_complex(frag_coord: vec4f) -> DsComplex {
  let width = max(render.control.z, 1.0);
  let height = max(render.control.w, 1.0);
  let aspect = render.colouring.z;
  let normalized = rotate_point(vec2f(
    ((frag_coord.x / width) - 0.5) * aspect,
    0.5 - (frag_coord.y / height),
  ));
  let scale = render.viewport.xy;

  return DsComplex(
    ds_add(render.centre.xy, ds_mul_f32(scale, normalized.x)),
    ds_add(render.centre.zw, ds_mul_f32(scale, normalized.y)),
  );
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertex_index], 0.0, 1.0);
  return output;
}

@fragment
fn fs_main(@builtin(position) frag_coord: vec4f) -> @location(0) vec4f {
  let point = pixel_to_complex(frag_coord);
  let bailout = max(render.control.x, 4.0);
  let bailout_squared = bailout * bailout;
  let max_iterations = max(u32(render.control.y), 1u);
  let colouring_code = render.colouring.y;
  let formula_code = render.colouring.w;
  let orbit_trap_scale = max(render.extras.x, 0.05);

  var z = DsComplex(vec2f(0.0, 0.0), vec2f(0.0, 0.0));
  var c = point;
  var trap_min = 1e9;

  if (formula_code > 0.5 && formula_code < 1.5) {
    z = point;
    c = DsComplex(render.julia.xy, render.julia.zw);
  }

  var iteration = 0u;
  var magnitude_squared = 0.0;

  loop {
    if (iteration >= max_iterations) {
      break;
    }

    if (formula_code > 1.5 && formula_code < 2.5) {
      z = ds_complex_add(ds_complex_burning_ship_square(z), c);
    } else if (formula_code > 2.5) {
      z = ds_complex_add(ds_complex_tricorn_square(z), c);
    } else {
      z = ds_complex_add(ds_complex_square(z), c);
    }
    if (colouring_code > 0.5) {
      trap_min = min(trap_min, trap_distance(z));
    }
    magnitude_squared = ds_to_f32(ds_complex_abs_square(z));

    if (magnitude_squared > bailout_squared) {
      break;
    }

    iteration = iteration + 1u;
  }

  if (iteration >= max_iterations) {
    if (colouring_code > 0.5) {
      let trap_t = orbit_trap_palette_t(trap_min, render.colouring.x, orbit_trap_scale);
      let trapped = textureSampleLevel(paletteTexture, paletteSampler, vec2f(trap_t, 0.5), 0.0);
      let interior = vec3f(0.02, 0.03, 0.06);
      return vec4f(blend_rgb(interior, trapped.rgb, orbit_trap_interior_mix(trap_min, orbit_trap_scale)), 1.0);
    }

    return vec4f(0.02, 0.03, 0.06, 1.0);
  }

  let smooth_iteration = f32(iteration) + 1.0 - log2(log2(max(sqrt(magnitude_squared), 1.0001)));
  let palette_t = fract(smooth_iteration * max(render.colouring.x, 0.0001));
  let color = textureSampleLevel(paletteTexture, paletteSampler, vec2f(palette_t, 0.5), 0.0);

  if (colouring_code > 0.5) {
    let trap_t = orbit_trap_palette_t(trap_min, render.colouring.x, orbit_trap_scale);
    let trapped = textureSampleLevel(paletteTexture, paletteSampler, vec2f(trap_t, 0.5), 0.0);
    let trap_mix = orbit_trap_exterior_mix(f32(iteration) / f32(max_iterations), trap_min, orbit_trap_scale);
    return vec4f(blend_rgb(color.rgb, trapped.rgb, trap_mix), 1.0);
  }

  return vec4f(color.rgb, 1.0);
}
`;

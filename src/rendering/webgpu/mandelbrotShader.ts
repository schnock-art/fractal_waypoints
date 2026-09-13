export const mandelbrotShader = /* wgsl */ `
struct RenderUniforms {
  centre: vec4f,
  viewport: vec4f,
  julia: vec4f,
  control: vec4f,
  material: vec4f,
  extras: vec4f,
  trap_first: vec4f,
  trap_second: vec4f,
  trap_controls: vec4f,
  trap_style: vec4f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
}

struct DsComplex {
  re: vec2f,
  im: vec2f,
}

struct OrbitMetrics {
  escaped: bool,
  iteration: u32,
  magnitude_squared: f32,
  trap_min: f32,
  final_trap_distance: f32,
  final_z: DsComplex,
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

fn trap_sdf(value: DsComplex, trap: vec4f, shape_code: f32) -> f32 {
  let translated = vec2f(ds_to_f32(value.re) - trap.x, ds_to_f32(value.im) - trap.y);
  let scale = max(trap.w, 0.05);
  let cosine = cos(-trap.z);
  let sine = sin(-trap.z);
  let local = vec2f(
    (translated.x * cosine - translated.y * sine) / scale,
    (translated.x * sine + translated.y * cosine) / scale,
  );

  if (shape_code < 0.5) {
    return length(local) * scale;
  }
  if (shape_code < 1.5) {
    return abs(local.y) * scale;
  }
  if (shape_code < 2.5) {
    return abs(length(local) - 0.5) * scale;
  }
  if (shape_code < 3.5) {
    return min(abs(local.x), abs(local.y)) * scale;
  }

  let target_radius = 0.36 + 0.11 * atan2(local.y, local.x);
  return abs(length(local) - target_radius) * scale;
}

fn trap_distance(value: DsComplex) -> f32 {
  let first = trap_sdf(value, render.trap_first, render.trap_controls.x);
  if (render.trap_controls.w < 1.5) {
    return first;
  }

  let second = trap_sdf(value, render.trap_second, render.trap_controls.y);
  if (render.trap_controls.z > 0.5) {
    return max(first, second);
  }
  return min(first, second);
}

fn clamp_unit(value: f32) -> f32 {
  return clamp(value, 0.0, 1.0);
}

fn orbit_trap_signal(min_trap_distance: f32, trap_scale: f32) -> f32 {
  let safe_scale = max(trap_scale, 0.05);
  return 1.0 / (1.0 + max(min_trap_distance, 0.0) * safe_scale * 12.0);
}

fn orbit_trap_palette_t(trap_distance_value: f32, density: f32, trap_scale: f32, mapping_code: f32) -> f32 {
  if (mapping_code > 0.5) {
    return fract(max(trap_distance_value, 0.0) * max(trap_scale, 0.05) * (12.0 + max(density, 0.0001) * 80.0));
  }
  return fract(orbit_trap_signal(trap_distance_value, trap_scale) * max(density, 0.0001) * 24.0);
}

fn orbit_trap_exterior_mix(normalized_iterations: f32, trap_distance_value: f32, trap_scale: f32, strength: f32) -> f32 {
  let boundary_bias = clamp_unit(normalized_iterations);
  let trap_bias = orbit_trap_signal(trap_distance_value, trap_scale);
  return clamp_unit((0.18 + boundary_bias * 0.30 + trap_bias * 0.18) * clamp_unit(strength));
}

fn orbit_trap_interior_mix(trap_distance_value: f32, trap_scale: f32, strength: f32) -> f32 {
  return clamp_unit((0.22 + orbit_trap_signal(trap_distance_value, trap_scale) * 0.42) * clamp_unit(strength));
}

fn blend_rgb(left: vec3f, right: vec3f, mix: f32) -> vec3f {
  let t = clamp_unit(mix);
  return left + ((right - left) * t);
}

fn apply_orbit_trap_emission(color: vec3f, accent: vec3f, trap_distance_value: f32, trap_scale: f32) -> vec3f {
  let emission = orbit_trap_signal(trap_distance_value, trap_scale) * clamp_unit(render.extras.w) * 0.55;
  return clamp(color + accent * emission, vec3f(0.0), vec3f(1.0));
}

fn apply_lens(color: vec3f, frag_coord: vec4f) -> vec4f {
  let width = max(render.control.z, 1.0);
  let height = max(render.control.w, 1.0);
  let normalized = vec2f(frag_coord.x / width, frag_coord.y / height);
  let distance_from_centre = length(normalized - vec2f(0.5, 0.5)) / 0.70710678;
  let vignette = 1.0 - clamp(render.extras.z, 0.0, 1.0) * pow(clamp(distance_from_centre, 0.0, 1.0), 1.8);
  return vec4f(clamp(color * max(render.extras.y, 0.1) * vignette, vec3f(0.0), vec3f(1.0)), 1.0);
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
  let aspect = render.material.z;
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

fn iterate_formula(
  point: DsComplex,
  bailout_squared: f32,
  max_iterations: u32,
  formula_code: f32,
  track_trap: bool,
) -> OrbitMetrics {
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
    if (track_trap) {
      trap_min = min(trap_min, trap_distance(z));
    }
    magnitude_squared = ds_to_f32(ds_complex_abs_square(z));

    if (magnitude_squared > bailout_squared) {
      let final_trap_distance = select(1e9, trap_distance(z), track_trap);
      return OrbitMetrics(true, iteration, magnitude_squared, trap_min, final_trap_distance, z);
    }

    iteration = iteration + 1u;
  }

  let final_trap_distance = select(1e9, trap_distance(z), track_trap);
  return OrbitMetrics(false, max_iterations, magnitude_squared, trap_min, final_trap_distance, z);
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
  let material_code = render.material.y;
  let formula_code = render.material.w;
  let orbit_trap_scale = max(render.extras.x, 0.05);

  let metrics = iterate_formula(point, bailout_squared, max_iterations, formula_code, material_code > 0.5);

  if (!metrics.escaped) {
    if (material_code > 0.5) {
      let trap_distance_value = select(metrics.trap_min, metrics.final_trap_distance, render.trap_style.x > 0.5);
      let trap_t = orbit_trap_palette_t(trap_distance_value, render.material.x, orbit_trap_scale, render.trap_style.y);
      let trapped = textureSampleLevel(paletteTexture, paletteSampler, vec2f(trap_t, 0.5), 0.0);
      let interior = vec3f(0.02, 0.03, 0.06);
      let mixed = blend_rgb(interior, trapped.rgb, orbit_trap_interior_mix(trap_distance_value, orbit_trap_scale, render.trap_style.w));
      return apply_lens(apply_orbit_trap_emission(mixed, trapped.rgb, trap_distance_value, orbit_trap_scale), frag_coord);
    }

    return apply_lens(vec3f(0.02, 0.03, 0.06), frag_coord);
  }

  let smooth_iteration = f32(metrics.iteration) + 1.0 - log2(log2(max(sqrt(metrics.magnitude_squared), 1.0001)));
  let palette_t = fract(smooth_iteration * max(render.material.x, 0.0001));
  let color = textureSampleLevel(paletteTexture, paletteSampler, vec2f(palette_t, 0.5), 0.0);

  if (material_code > 0.5) {
    let trap_distance_value = select(metrics.trap_min, metrics.final_trap_distance, render.trap_style.x > 0.5);
    let trap_t = orbit_trap_palette_t(trap_distance_value, render.material.x, orbit_trap_scale, render.trap_style.y);
    let trapped = textureSampleLevel(paletteTexture, paletteSampler, vec2f(trap_t, 0.5), 0.0);
    let trap_mix = orbit_trap_exterior_mix(f32(metrics.iteration) / f32(max_iterations), trap_distance_value, orbit_trap_scale, render.trap_style.z);
    let mixed = blend_rgb(color.rgb, trapped.rgb, trap_mix);
    return apply_lens(apply_orbit_trap_emission(mixed, trapped.rgb, trap_distance_value, orbit_trap_scale), frag_coord);
  }

  return apply_lens(color.rgb, frag_coord);
}
`;

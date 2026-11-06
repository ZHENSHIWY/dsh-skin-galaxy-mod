/** Procedural Milky Way: warped dust lanes, emission clouds, and layered stars. */
export const shader = /* wgsl */ `
struct Uniforms {
  resolution: vec2f, time: f32, intensity: f32,
  meteor: vec4f, meteorStyle: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p); let w = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2f(1,0)), w.x),
             mix(hash(i+vec2f(0,1)), hash(i+vec2f(1,1)), w.x), w.y);
}
fn fbm(p: vec2f) -> f32 {
  var q = p; var result = 0.0; var amplitude = 0.5;
  for (var i = 0; i < 5; i++) {
    result += amplitude*noise(q);
    q = mat2x2f(0.8, -0.6, 0.6, 0.8)*q*2.07+vec2f(17.1, 9.2);
    amplitude *= 0.5;
  }
  return result;
}
fn stars(p: vec2f, scale: f32, layer: f32) -> vec3f {
  let grid = p*scale; let cell = floor(grid);
  var light = vec3f(0);
  // Adjacent cells keep bright star halos continuous across cell edges.
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let id = cell+vec2f(f32(x),f32(y)); let seed = hash(id+layer*37.0);
      let offset = vec2f(hash(id+13.7),hash(id+47.2));
      let d = grid-id-offset; let r = length(d);
      let occupied = smoothstep(0.79, 0.99, seed);
      let twinkle = 0.78+0.22*sin(u.time*(0.6+seed)+seed*100.0);
      let core = exp(-r*r/(0.00035+seed*0.0008));
      let halo = exp(-r*14.0)*0.10;
      let flare = exp(-abs(d.x)*170.0-abs(d.y)*9.0)
                + exp(-abs(d.y)*170.0-abs(d.x)*9.0);
      let bright = select(0.0, flare*0.16, seed>0.993);
      let tint = mix(vec3f(0.56,0.72,1.0),vec3f(1.0,0.88,0.70),hash(id+4.2));
      light += tint*(core+halo+bright)*occupied*twinkle;
    }
  }
  return light;
}
fn shootingStar(p: vec2f) -> vec3f {
  if (u.meteorStyle.z <= 0.0) { return vec3f(0.0); }
  let delta = p-u.meteor.xy;
  let direction = u.meteor.zw;
  let behind = -dot(delta,direction);
  let across = abs(dot(delta,vec2f(-direction.y,direction.x)));
  let length = u.meteorStyle.x;
  let width = u.meteorStyle.y;
  let taper = 1.0-0.8*clamp(behind/length,0.0,1.0);
  let fade = exp(-max(behind,0.0)/(length*0.35))
    *step(0.0,behind)*(1.0-smoothstep(length*0.7,length,behind));
  let trail = exp(-pow(across/(width*taper),2.0))*fade;
  let glow = exp(-across/(width*4.0))*fade*0.18;
  let head = exp(-dot(delta,delta)/(width*width*3.0));
  return vec3f(0.70,0.85,1.0)*(trail+glow+head*1.4)*u.meteorStyle.z;
}
@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let xy = vec2f(f32((i<<1u)&2u), f32(i&2u));
  return vec4f(xy*2.0-1.0,0.0,1.0);
}
@fragment fn fragment(@builtin(position) pixel: vec4f) -> @location(0) vec4f {
  let uv = pixel.xy/u.resolution;
  let p = (pixel.xy-u.resolution*0.5)/u.resolution.y;
  let drift = vec2f(u.time*0.012, u.time*0.004);
  let q = p+drift;
  // Broad clouds curl while fine wisps stream through them at a different speed.
  let flow = vec2f(sin(q.y*2.4+u.time*0.25), cos(q.x*2.1-u.time*0.19))*0.08;
  let cloud = q+flow;
  // Diagonal band runs from lower left to upper right, away from the text centre.
  let along = q.x*0.82-q.y*0.57;
  let across = q.x*0.57+q.y*0.82+0.10;
  let turbulence = fbm(vec2f(along*2.2, across*3.0)+flow*2.0+8.0);
  let wave = sin(along*3.0+u.time*0.30)*0.035;
  let lane = across+(turbulence-0.5)*0.26+wave;
  let band = exp(-lane*lane*15.0);
  let detail = fbm(cloud*7.0+vec2f(turbulence*3.0+u.time*0.045, 1.7));
  let wisps = fbm(cloud*15.0+detail*2.0+vec2f(-u.time*0.09,u.time*0.055));
  let dust = smoothstep(0.36,0.70,fbm(vec2f(along*8.0,lane*21.0)+detail+vec2f(u.time*0.04,0.0)));
  let core = exp(-lane*lane*100.0)*(0.35+detail*0.8);
  let violet = vec3f(0.24,0.10,0.46)*band*detail;
  let blue = vec3f(0.07,0.29,0.48)*band*wisps;
  let blush = vec3f(0.44,0.17,0.31)*pow(detail,3.0)*band;
  var color = vec3f(0.007,0.012,0.035);
  color += (violet+blue+blush+vec3f(0.38,0.40,0.54)*core*wisps)
           *(1.0-dust*0.8)*u.intensity;
  color += stars(p+drift*0.18,75.0,1.0)*0.65;
  color += stars(p*0.98+drift*0.42,29.0,2.0)*0.8;
  color += shootingStar(p);
  // Very fine galactic stars concentrate inside the luminous band.
  let grain = hash(floor(pixel.xy*0.7));
  color += vec3f(0.35,0.42,0.65)*pow(grain,60.0)*band*detail*u.intensity;
  let vignette = 1.0-0.38*smoothstep(0.2,0.95,length((uv-0.5)*vec2f(1.0,0.8)));
  color *= vignette;
  color = vec3f(1.0)-exp(-color*1.65);
  return vec4f(color,1.0);
}
`;

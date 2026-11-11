window.__ModuleLoader__.load({
	id: "dsh-skin-galaxy",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/config.ts
		/** Validate deployment controls before allocating GPU resources. */
		function resolveConfig(input = {}) {
			const result = {
				speed: .65,
				intensity: .8,
				pixelRatio: 1.25,
				fps: 30,
				meteorInterval: 10,
				bootAnimation: true,
				bootDuration: 2e3,
				bootRevealDelay: 1200,
				bootRevealDuration: 800,
				...input
			};
			const ranges = {
				speed: [0, 2],
				intensity: [0, 2],
				pixelRatio: [.5, 2],
				fps: [1, 60],
				meteorInterval: [3, 60],
				bootDuration: [800, 6e3],
				bootRevealDelay: [0, 5e3],
				bootRevealDuration: [100, 3e3]
			};
			for (const key of Object.keys(ranges)) {
				const [min, max] = ranges[key];
				if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new Error(`星河: config.${key} must be a finite number between ${min} and ${max}`);
			}
			if (typeof result.bootAnimation !== "boolean") throw new Error("鏄熸渤: config.bootAnimation must be a boolean");
			return result;
		}
		//#endregion
		//#region src/shader.ts
		/** Procedural Milky Way: warped dust lanes, emission clouds, and layered stars. */
		const shader = `
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
  let drift = vec2f(sin(u.time*0.040)*0.16, sin(u.time*0.040+1.7)*0.10);
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
		//#endregion
		//#region src/meteors.ts
		/** A visible-time scheduler; hidden tabs do not advance its clock or queue bursts. */
		function createMeteorTimeline(interval, random = Math.random) {
			let nextAt;
			let active;
			return (now, aspect) => {
				if (nextAt === void 0) {
					nextAt = now + interval * (.7 + random() * .9);
					return;
				}
				if (active && now - active.start >= active.duration) active = void 0;
				if (!active && now >= nextAt) {
					const angle = random() * Math.PI * 2;
					const dx = Math.cos(angle), dy = Math.sin(angle);
					const centerX = (random() - .5) * aspect * .82;
					const centerY = (random() - .5) * .7;
					const roomX = (aspect * .5 - Math.abs(centerX) - aspect * .06) / Math.max(Math.abs(dx), .001);
					const roomY = (.5 - Math.abs(centerY) - .06) / Math.max(Math.abs(dy), .001);
					const distance = Math.min(.55 + random() * .3, roomX * 2, roomY * 2);
					const duration = .85 + random() * .5;
					active = {
						start: now,
						duration,
						distance,
						frame: {
							x: centerX - dx * distance * .5,
							y: centerY - dy * distance * .5,
							dx,
							dy,
							tail: Math.min(.22, distance * .45),
							width: .0014 + random() * 8e-4,
							strength: 0
						}
					};
					nextAt = now + duration + interval * (.7 + random() * .9);
				}
				if (!active) return void 0;
				const progress = (now - active.start) / active.duration;
				return {
					...active.frame,
					x: active.frame.x + active.frame.dx * active.distance * progress,
					y: active.frame.y + active.frame.dy * active.distance * progress,
					strength: Math.pow(Math.sin(progress * Math.PI), .7) * .9
				};
			};
		}
		//#endregion
		//#region src/renderer.ts
		/** One mounted canvas, including async initialization and deterministic disposal. */
		function mountGalaxy(canvas, config) {
			let disposed = false;
			let device;
			let context = null;
			let buffer;
			let frame = 0;
			let draw;
			let elapsed = 0;
			let visibleElapsed = 0;
			const meteorAt = createMeteorTimeline(config.meteorInterval);
			let previous;
			const motion = matchMedia("(prefers-reduced-motion: reduce)");
			const status = (value) => {
				canvas.dataset.galaxyRenderer = value;
			};
			const cancel = () => {
				cancelAnimationFrame(frame);
				frame = 0;
				previous = void 0;
			};
			const schedule = () => {
				cancel();
				if (!disposed && !document.hidden && draw) frame = requestAnimationFrame(draw);
			};
			const fail = (error) => {
				if (disposed) return;
				cancel();
				draw = void 0;
				status("fallback");
				canvas.style.opacity = "0";
				console.warn("[星河] WebGPU unavailable; retaining static nebula.", error);
				buffer?.destroy();
				context?.unconfigure();
				device?.destroy();
			};
			const resize = new ResizeObserver(schedule);
			resize.observe(canvas);
			document.addEventListener("visibilitychange", schedule);
			motion.addEventListener("change", schedule);
			status("initializing");
			(async () => {
				if (!navigator.gpu) throw new Error("This browser does not expose WebGPU in this context.");
				const adapter = await navigator.gpu.requestAdapter({ powerPreference: "low-power" });
				if (!adapter) throw new Error("No WebGPU adapter available.");
				if (disposed) return;
				const acquired = await adapter.requestDevice();
				if (disposed) {
					acquired.destroy();
					return;
				}
				device = acquired;
				context = canvas.getContext("webgpu");
				if (!context) throw new Error("Cannot create a WebGPU canvas context.");
				const format = navigator.gpu.getPreferredCanvasFormat();
				context.configure({
					device,
					format,
					alphaMode: "opaque"
				});
				const module = device.createShaderModule({
					label: "星河 · Milky Way WGSL",
					code: shader
				});
				const errors = (await module.getCompilationInfo()).messages.filter((message) => message.type === "error");
				if (errors.length) throw new Error(errors.map((message) => `${message.lineNum}: ${message.message}`).join("\n"));
				if (disposed) return;
				const pipeline = await device.createRenderPipelineAsync({
					label: "星河 · nebula and stars",
					layout: "auto",
					vertex: {
						module,
						entryPoint: "vertex"
					},
					fragment: {
						module,
						entryPoint: "fragment",
						targets: [{ format }]
					},
					primitive: { topology: "triangle-list" }
				});
				if (disposed) return;
				buffer = device.createBuffer({
					size: 48,
					usage: 72
				});
				const bind = device.createBindGroup({
					layout: pipeline.getBindGroupLayout(0),
					entries: [{
						binding: 0,
						resource: { buffer }
					}]
				});
				const uniforms = new Float32Array(12);
				device.addEventListener("uncapturederror", (event) => fail(event.error));
				device.lost.then((info) => {
					if (!disposed && info.reason !== "destroyed") fail(new Error(info.message));
				});
				draw = (now) => {
					frame = 0;
					if (disposed || document.hidden || !device || !buffer || !context) return;
					if (previous !== void 0 && now - previous < 1e3 / config.fps - .5) {
						frame = requestAnimationFrame(draw);
						return;
					}
					if (previous !== void 0 && !motion.matches) {
						const delta = Math.min((now - previous) / 1e3, .1);
						elapsed += delta * config.speed;
						visibleElapsed += delta;
					}
					previous = now;
					const rect = canvas.getBoundingClientRect();
					const ratio = Math.min(window.devicePixelRatio || 1, config.pixelRatio);
					const scale = Math.min(ratio, 1920 / Math.max(rect.width, 1), 1200 / Math.max(rect.height, 1));
					const width = Math.max(1, Math.round(rect.width * scale));
					const height = Math.max(1, Math.round(rect.height * scale));
					if (canvas.width !== width) canvas.width = width;
					if (canvas.height !== height) canvas.height = height;
					uniforms.set([
						canvas.width,
						canvas.height,
						motion.matches ? 0 : elapsed,
						config.intensity
					]);
					uniforms.fill(0, 4);
					const meteor = !motion.matches && config.speed > 0 ? meteorAt(visibleElapsed, canvas.width / canvas.height) : void 0;
					if (meteor) {
						uniforms.set([
							meteor.x,
							meteor.y,
							meteor.dx,
							meteor.dy
						], 4);
						uniforms.set([
							meteor.tail,
							meteor.width,
							meteor.strength,
							0
						], 8);
					}
					try {
						device.queue.writeBuffer(buffer, 0, uniforms);
						const encoder = device.createCommandEncoder();
						const pass = encoder.beginRenderPass({ colorAttachments: [{
							view: context.getCurrentTexture().createView(),
							loadOp: "clear",
							storeOp: "store",
							clearValue: {
								r: .007,
								g: .012,
								b: .035,
								a: 1
							}
						}] });
						pass.setPipeline(pipeline);
						pass.setBindGroup(0, bind);
						pass.draw(3);
						pass.end();
						device.queue.submit([encoder.finish()]);
						const meteorState = meteor && meteor.strength > .05 ? "visible" : "waiting";
						if (canvas.dataset.galaxyMeteor !== meteorState) canvas.dataset.galaxyMeteor = meteorState;
						status(motion.matches || config.speed === 0 ? "webgpu-static" : "webgpu");
						canvas.style.opacity = "1";
					} catch (error) {
						fail(error);
						return;
					}
					if (!motion.matches && config.speed > 0) frame = requestAnimationFrame(draw);
				};
				schedule();
			})().catch(fail);
			return () => {
				disposed = true;
				cancel();
				resize.disconnect();
				document.removeEventListener("visibilitychange", schedule);
				motion.removeEventListener("change", schedule);
				buffer?.destroy();
				context?.unconfigure();
				device?.destroy();
				status("disposed");
			};
		}
		//#endregion
		//#region src/boot.ts
		function showBootOverlay(options) {
			const { reducedMotion } = options;
			const duration = reducedMotion ? Math.min(options.duration, 450) : options.duration;
			const revealDelay = reducedMotion ? 0 : options.revealDelay;
			const revealDuration = reducedMotion ? 180 : options.revealDuration;
			const overlay = document.createElement("div");
			overlay.dataset.galaxyBoot = "";
			overlay.setAttribute("aria-hidden", "true");
			overlay.style.setProperty("--galaxy-boot-duration", `${duration}ms`);
			if (reducedMotion) overlay.dataset.galaxyBootReduced = "";
			document.body.append(overlay);
			document.body.dataset.galaxyBootReveal = "hidden";
			document.body.style.setProperty("--galaxy-reveal-duration", `${revealDuration}ms`);
			let overlayRemoved = false;
			let revealed = false;
			let overlayTimer = 0;
			let revealTimer = 0;
			let cleanupTimer = 0;
			const removeOverlay = () => {
				if (overlayRemoved) return;
				overlayRemoved = true;
				overlay.remove();
			};
			const cleanupListeners = () => {
				window.removeEventListener("keydown", onKeyDown, true);
				window.removeEventListener("pointerdown", onSkip, true);
				overlay.removeEventListener("pointerdown", onSkip);
			};
			const finish = () => {
				if (revealed) return;
				revealed = true;
				clearTimeout(overlayTimer);
				clearTimeout(revealTimer);
				removeOverlay();
				cleanupListeners();
				document.body.dataset.galaxyBootReveal = "shown";
				cleanupTimer = setTimeout(() => {
					if (document.body.dataset.galaxyBootReveal === "shown") delete document.body.dataset.galaxyBootReveal;
					document.body.style.removeProperty("--galaxy-reveal-duration");
				}, revealDuration + 100);
			};
			const onSkip = (event) => {
				event.preventDefault();
				event.stopImmediatePropagation();
				finish();
			};
			const onKeyDown = (event) => {
				if (event.key !== "Escape" && event.key !== "Enter" && event.key !== " ") return;
				onSkip(event);
			};
			overlay.addEventListener("pointerdown", onSkip);
			window.addEventListener("keydown", onKeyDown, true);
			window.addEventListener("pointerdown", onSkip, true);
			overlayTimer = setTimeout(() => {
				removeOverlay();
				revealTimer = setTimeout(finish, revealDelay);
			}, duration);
			return () => {
				clearTimeout(overlayTimer);
				clearTimeout(revealTimer);
				clearTimeout(cleanupTimer);
				removeOverlay();
				cleanupListeners();
				delete document.body.dataset.galaxyBootReveal;
				document.body.style.removeProperty("--galaxy-reveal-duration");
			};
		}
		//#endregion
		//#region src/bootStyles.ts
		const bootStyles = `
[data-galaxy-boot] {
  position: fixed; inset: 0; z-index: 2147483646; overflow: hidden;
  display: grid; place-items: center; pointer-events: auto;
  background-color: #02040c;
  background-image:
    radial-gradient(1.5px 1.5px at 16% 22%, rgba(255,255,255,.95), transparent 60%),
    radial-gradient(1px 1px at 31% 68%, rgba(200,215,255,.8), transparent 60%),
    radial-gradient(1.5px 1.5px at 48% 18%, rgba(255,255,255,.85), transparent 60%),
    radial-gradient(1px 1px at 62% 76%, rgba(190,205,255,.8), transparent 60%),
    radial-gradient(1px 1px at 78% 34%, rgba(255,255,255,.9), transparent 60%),
    radial-gradient(1.5px 1.5px at 88% 66%, rgba(210,220,255,.75), transparent 60%),
    radial-gradient(ellipse at 72% 20%, rgba(41,55,108,.55), transparent 55%),
    radial-gradient(ellipse at 35% 70%, rgba(96,63,116,.35), transparent 55%);
  animation: galaxy-boot-overlay var(--galaxy-boot-duration, 2000ms) ease-in-out forwards;
}
[data-galaxy-boot]::before {
  content: "星河";
  font-size: clamp(34px, 6vw, 72px);
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: .42em;
  text-indent: .42em;
  color: #f2f4ff;
  text-shadow: 0 0 18px rgba(154,145,255,.9), 0 0 72px rgba(74,109,255,.45);
  opacity: 0;
  animation: galaxy-boot-title var(--galaxy-boot-duration, 2000ms) cubic-bezier(.2,.8,.2,1) forwards;
}
[data-galaxy-boot]::after {
  content: "";
  position: absolute; inset: -35%;
  background: linear-gradient(112deg, transparent 36%, rgba(120,155,255,.25) 44%, rgba(210,200,255,.85) 50%, rgba(120,155,255,.25) 56%, transparent 64%);
  transform: translateX(-65%) rotate(10deg);
  filter: blur(10px);
  opacity: 0;
  animation: galaxy-boot-band var(--galaxy-boot-duration, 2000ms) ease-out forwards;
}
@keyframes galaxy-boot-overlay {
  0%, 82% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes galaxy-boot-title {
  0% { opacity: 0; transform: translateY(12px) scale(.96); letter-spacing: .2em; }
  35%, 75% { opacity: 1; }
  75% { transform: translateY(0) scale(1); letter-spacing: .42em; }
  100% { opacity: 0; transform: translateY(-8px) scale(1.02); }
}
@keyframes galaxy-boot-band {
  0% { opacity: 0; transform: translateX(-65%) rotate(10deg); }
  20% { opacity: .9; }
  70% { opacity: .55; }
  100% { opacity: 0; transform: translateX(30%) rotate(10deg); }
}
@media (prefers-reduced-motion: reduce) {
  [data-galaxy-boot] { animation: galaxy-boot-overlay 450ms linear forwards; }
  [data-galaxy-boot]::before, [data-galaxy-boot]::after { animation: none; }
  [data-galaxy-boot]::before { opacity: 1; }
}

body[data-galaxy-boot-reveal="hidden"] #root {
  opacity: 0;
  pointer-events: none;
}
body[data-galaxy-boot-reveal="shown"] #root {
  opacity: 1;
  pointer-events: auto;
  transition: opacity var(--galaxy-reveal-duration, 800ms) ease-out;
}
body[data-galaxy-boot-reveal="hidden"] [class*="_sidebarCol"],
body[data-galaxy-boot-reveal="hidden"] [class*="_centerCol"],
body[data-galaxy-boot-reveal="hidden"] [class*="_rightbarCol"] {
  opacity: 0;
  transform: translateY(8px);
}
body[data-galaxy-boot-reveal="shown"] [class*="_sidebarCol"],
body[data-galaxy-boot-reveal="shown"] [class*="_centerCol"],
body[data-galaxy-boot-reveal="shown"] [class*="_rightbarCol"] {
  opacity: 1;
  transform: none;
  transition: opacity var(--galaxy-reveal-duration, 800ms) ease-out,
    transform var(--galaxy-reveal-duration, 800ms) ease-out;
}
body[data-galaxy-boot-reveal="shown"] [class*="_sidebarCol"] { transition-delay: 0ms; }
body[data-galaxy-boot-reveal="shown"] [class*="_centerCol"] { transition-delay: 120ms; }
body[data-galaxy-boot-reveal="shown"] [class*="_rightbarCol"] { transition-delay: 240ms; }
@media (prefers-reduced-motion: reduce) {
  body[data-galaxy-boot-reveal="shown"] #root,
  body[data-galaxy-boot-reveal="shown"] [class*="_sidebarCol"],
  body[data-galaxy-boot-reveal="shown"] [class*="_centerCol"],
  body[data-galaxy-boot-reveal="shown"] [class*="_rightbarCol"] {
    transition: none;
  }
}`;
		//#endregion
		//#region src/styles.ts
		/** Scoped presentation; menus and editors retain opaque readable surfaces. */
		const styles = `
[data-galaxy-sky] {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
  background: radial-gradient(ellipse at 75% 20%,#29376c80,transparent 55%),
    radial-gradient(ellipse at 35% 65%,#603f7455,transparent 55%),#040817;
}
[data-galaxy-sky] canvas { width: 100%; height: 100%; display: block; opacity: 0; }
body[data-galaxy-active] { background: #040817; isolation: isolate; }
body[data-galaxy-active] #root { position: relative; z-index: 1; }
/* The prose backing isolates glyphs from bright dust lanes without obscuring the sky. */
body[data-galaxy-active] [class*="_markdown_"] {
  background: rgba(14, 23, 44, 0.22);
  border: 1px solid rgba(183, 201, 255, 0.15);
  border-radius: 16px;
  padding: 18px 22px;
  color: var(--dsw-alias-label-primary);
  backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
}
body[data-galaxy-active] [class*="_markdown_"] :is(th, td) {
  border-color: rgba(183, 201, 255, 0.24);
}
@media (max-width: 700px) {
  body[data-galaxy-active] [class*="_markdown_"] { padding: 14px; }
}
body[data-galaxy-active] ::selection { background: #9a91ff66; color: #fff; }
[data-windows-titlebar] .mP3x-q_frame { background: transparent !important; }
body[data-galaxy-active] [class*="HOHHba_card"] {
  --changes-fill: rgba(21, 32, 56, 0.25);
  --changes-hover: rgba(30, 43, 70, 0.40);
}
body[data-galaxy-active] [class*="HOHHba_tile"] {
  background: rgba(30, 43, 70, 0.40);
}
body[data-galaxy-active] [data-galaxy-panel] {
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
}
`;
		/** Semantic palette consumed by DSH's theme presenter, including transparent layout fills. */
		const tokens = {
			"--dsw-alias-bg-base": "transparent",
			"--dsw-alias-bg-layer-1": "rgba(21,32,56,0.25)",
			"--dsw-alias-bg-layer-2": "rgba(30,43,70,0.96)",
			"--dsw-alias-bg-layer-3": "#202b48",
			"--dsw-alias-bg-overlay": "#151c35",
			"--dsw-specific-sidebar-fill": "rgba(18,28,49,0.25)",
			"--dsw-alias-border-l1": "rgba(176,187,239,0.22)",
			"--dsw-alias-border-l2": "rgba(176,187,239,0.17)",
			"--dsw-alias-border-l3": "rgba(176,187,239,0.13)",
			"--dsw-alias-border-l4": "rgba(176,187,239,0.09)",
			"--dsw-alias-brand-primary": "#b0a5ff",
			"--dsw-alias-label-primary": "#f4f6ff",
			"--dsw-alias-label-secondary": "#d1daf0",
			"--dsw-alias-label-tertiary": "#b5c3e2",
			"--dsw-alias-label-caption": "#bac8e7",
			"--dsw-alias-label-dimmed": "#6e7b9c",
			"--dsw-alias-label-primary-dimmed": "#a9b4d3",
			"--dsw-alias-label-primary-bluish": "#c1cded",
			"--dsw-alias-label-primary-foreground": "#11152d",
			"--dsw-alias-label-primary-inverted": "#11152d",
			"--dsw-alias-brand-text": "#bdb2ff",
			"--dsw-alias-brand-primary-invert": "#15182c",
			"--dsw-alias-button-primary-hover": "#c7bfff",
			"--dsw-alias-button-primary-dimmed": "#353953",
			"--dsw-alias-button-contrast-fill": "#a99ee9",
			"--dsw-alias-button-elevated-fill": "#18213b",
			"--dsw-alias-button-floating-fill": "#18213b",
			"--dsw-alias-button-floating-hover": "#263150",
			"--dsw-alias-button-ghost-active-fill": "#252b48",
			"--dsw-alias-button-ghost-active-hover": "#32395c",
			"--dsw-alias-interactive-bg-active": "rgba(176,165,255,0.16)",
			"--dsw-alias-interactive-bg-hover": "rgba(176,165,255,0.09)",
			"--dsw-alias-interactive-bg-hover-solid": "#242d48",
			"--dsw-alias-interactive-bg-hover-accent": "rgba(176,165,255,0.20)",
			"--dsw-alias-link": "#b6baff",
			"--dsw-alias-menu-icon": "#c2cce8",
			"--dsw-menu-surface-fill": "rgba(16,23,44,0.97)",
			"--dsw-specific-menu": "rgba(16,23,44,0.97)",
			"--dsw-alias-menu-group-header-fill": "#1a233e",
			"--dsw-specific-input-major": "rgba(23,35,59,0.36)",
			"--dsw-specific-login-input": "#17213b",
			"--dsw-specific-selector": "#202a46",
			"--dsw-specific-sidebar-nav-item-active": "rgba(176,165,255,0.13)",
			"--dsw-specific-sidebar-nav-item-active-accent": "rgba(176,165,255,0.20)",
			"--dsw-specific-bubble": "rgba(39,44,77,0.18)",
			"--dsw-specific-bubble-highlight": "#3c4168",
			"--dsw-specific-tip": "#202a46",
			"--dsw-alias-markdown-code-block": "#0c1328",
			"--dsw-alias-markdown-code-block-banner": "#141e36",
			"--dsw-alias-markdown-inline-code": "#222b47",
			"--dsw-alias-markdown-code-segment-unselected": "#141e36",
			"--dsw-alias-markdown-code-segment-selected": "#283453",
			"--dsw-alias-markdown-citation": "#252e4c",
			"--dsw-alias-markdown-tag": "#252e4c",
			"--dsw-alias-markdown-placeholder": "#1a2440",
			"--dsw-alias-bg-document-preview": "#111a30",
			"--dsw-alias-label-document-preview": "#dce3fa",
			"--dsw-alias-bg-module-platform": "#141e36",
			"--dsw-alias-bg-multi-select": "#27314f",
			"--dsw-alias-settings-card-fill": "rgba(16,23,47,0.86)",
			"--dsw-alias-file-diff-added-bg": "rgba(34,197,94,0.18)",
			"--dsw-alias-file-diff-added-gutter": "rgba(34,197,94,0.30)",
			"--dsw-alias-file-diff-added-marker": "#7ef0ac",
			"--dsw-alias-file-diff-deleted-bg": "rgba(239,68,68,0.18)",
			"--dsw-alias-file-diff-deleted-gutter": "rgba(239,68,68,0.30)",
			"--dsw-alias-file-diff-deleted-marker": "#ff9b91",
			"--dsw-alias-code-diff-added": "rgba(34,197,94,0.22)",
			"--dsw-alias-code-diff-deleted": "rgba(239,68,68,0.22)"
		};
		//#endregion
		//#region src/client.ts
		/** Required browser service: the supported theme registry. */
		const inject = ["theme"];
		/** Layer the skin over either palette without changing the saved appearance preference. */
		function apply(ctx, input = {}) {
			const config = resolveConfig(input);
			const overrides = Object.fromEntries(Object.entries(tokens).map(([key, value]) => [key, {
				light: value,
				dark: value
			}]));
			ctx.effect(() => ctx.theme.overrideTokens("dsh-skin-galaxy", overrides), "galaxy: palette");
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "dsh-skin-galaxy";
				style.textContent = styles + bootStyles;
				document.head.append(style);
				const sky = document.createElement("div");
				sky.dataset.galaxySky = "";
				sky.setAttribute("aria-hidden", "true");
				const canvas = document.createElement("canvas");
				sky.append(canvas);
				document.body.prepend(sky);
				document.body.dataset.galaxyActive = "";
				const stop = mountGalaxy(canvas, config);
				return () => {
					stop();
					sky.remove();
					style.remove();
					delete document.body.dataset.galaxyActive;
				};
			}, "galaxy: presentation");
			if (config.bootAnimation) {
				const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
				ctx.effect(() => showBootOverlay({
					duration: config.bootDuration,
					revealDelay: config.bootRevealDelay,
					revealDuration: config.bootRevealDuration,
					reducedMotion
				}), "galaxy: boot animation");
			}
			ctx.effect(() => {
				const onKeyDown = (event) => {
					if (event.key !== "F11") return;
					event.preventDefault();
					event.stopImmediatePropagation();
					if (document.fullscreenElement) document.exitFullscreen();
					else document.documentElement.requestFullscreen();
				};
				window.addEventListener("keydown", onKeyDown, true);
				return () => window.removeEventListener("keydown", onKeyDown, true);
			}, "galaxy: fullscreen hotkey");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
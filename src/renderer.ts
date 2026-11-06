import { shader } from './shader.ts';
import type { GalaxyConfig } from './config.ts';
import { createMeteorTimeline } from './meteors.ts';

// TypeScript 6 ships GPU interfaces but omits this canvas overload.
declare global {
  interface HTMLCanvasElement {
    getContext(contextId: 'webgpu'): GPUCanvasContext | null;
  }
}

/** One mounted canvas, including async initialization and deterministic disposal. */
export function mountGalaxy(canvas: HTMLCanvasElement, config: GalaxyConfig): () => void {
  let disposed = false;
  let device: GPUDevice | undefined;
  let context: GPUCanvasContext | null = null;
  let buffer: GPUBuffer | undefined;
  let frame = 0;
  let draw: ((now: number) => void) | undefined;
  let elapsed = 0;
  let visibleElapsed = 0;
  const meteorAt = createMeteorTimeline(config.meteorInterval);
  let previous: number | undefined;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const status = (value: string) => { canvas.dataset.galaxyRenderer = value; };
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; previous = undefined; };
  const schedule = () => {
    cancel();
    if (!disposed && !document.hidden && draw) frame = requestAnimationFrame(draw);
  };
  const fail = (error: unknown) => {
    if (disposed) return;
    cancel(); draw = undefined;
    status('fallback');
    canvas.style.opacity = '0';
    console.warn('[星河] WebGPU unavailable; retaining static nebula.', error);
    buffer?.destroy(); context?.unconfigure(); device?.destroy();
  };
  const resize = new ResizeObserver(schedule);
  resize.observe(canvas);
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  status('initializing');

  void (async () => {
    if (!navigator.gpu) throw new Error('This browser does not expose WebGPU in this context.');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
    if (!adapter) throw new Error('No WebGPU adapter available.');
    if (disposed) return;
    const acquired = await adapter.requestDevice();
    if (disposed) { acquired.destroy(); return; }
    device = acquired;
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('Cannot create a WebGPU canvas context.');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    const module = device.createShaderModule({ label: '星河 · Milky Way WGSL', code: shader });
    const compilation = await module.getCompilationInfo();
    const errors = compilation.messages.filter(message => message.type === 'error');
    if (errors.length) throw new Error(errors.map(message => `${message.lineNum}: ${message.message}`).join('\n'));
    if (disposed) return;
    const pipeline = await device.createRenderPipelineAsync({
      label: '星河 · nebula and stars', layout: 'auto',
      vertex: { module, entryPoint: 'vertex' },
      fragment: { module, entryPoint: 'fragment', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });
    if (disposed) return;
    // WebGPU's normative GPUBufferUsage bits: UNIFORM (0x40), COPY_DST (0x08).
    buffer = device.createBuffer({ size: 48, usage: 0x40 | 0x08 });
    const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer } }] });
    const uniforms = new Float32Array(12);
    device.addEventListener('uncapturederror', event => fail(event.error));
    void device.lost.then(info => { if (!disposed && info.reason !== 'destroyed') fail(new Error(info.message)); });
    draw = (now) => {
      frame = 0;
      if (disposed || document.hidden || !device || !buffer || !context) return;
      if (previous !== undefined && now-previous < 1000/config.fps-0.5) {
        frame = requestAnimationFrame(draw!); return;
      }
      if (previous !== undefined && !motion.matches) {
        const delta = Math.min((now-previous)/1000,0.1);
        elapsed += delta*config.speed;
        visibleElapsed += delta;
      }
      previous = now;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, config.pixelRatio);
      // Bound fragment cost on large displays while preserving the viewport aspect ratio.
      const scale = Math.min(ratio, 1920/Math.max(rect.width,1), 1200/Math.max(rect.height,1));
      const width = Math.max(1,Math.round(rect.width*scale));
      const height = Math.max(1,Math.round(rect.height*scale));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      uniforms.set([canvas.width,canvas.height,motion.matches ? 0 : elapsed,config.intensity]);
      uniforms.fill(0,4);
      const meteor = !motion.matches && config.speed > 0 ? meteorAt(visibleElapsed,canvas.width/canvas.height) : undefined;
      if (meteor) {
        uniforms.set([meteor.x,meteor.y,meteor.dx,meteor.dy],4);
        uniforms.set([meteor.tail,meteor.width,meteor.strength,0],8);
      }
      try {
        device.queue.writeBuffer(buffer,0,uniforms);
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({ colorAttachments: [{
          view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store',
          clearValue: { r: 0.007, g: 0.012, b: 0.035, a: 1 },
        }] });
        pass.setPipeline(pipeline); pass.setBindGroup(0,bind); pass.draw(3); pass.end();
        device.queue.submit([encoder.finish()]);
        const meteorState = meteor && meteor.strength > 0.05 ? 'visible' : 'waiting';
        if (canvas.dataset.galaxyMeteor !== meteorState) canvas.dataset.galaxyMeteor = meteorState;
        status(motion.matches || config.speed === 0 ? 'webgpu-static' : 'webgpu');
        canvas.style.opacity = '1';
      } catch (error) { fail(error); return; }
      if (!motion.matches && config.speed > 0) frame = requestAnimationFrame(draw!);
    };
    schedule();
  })().catch(fail);

  return () => {
    disposed = true; cancel(); resize.disconnect();
    document.removeEventListener('visibilitychange',schedule);
    motion.removeEventListener('change',schedule);
    buffer?.destroy(); context?.unconfigure(); device?.destroy();
    status('disposed');
  };
}

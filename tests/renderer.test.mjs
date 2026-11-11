import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountGalaxy } from '../src/renderer.ts';
import { resolveConfig } from '../src/config.ts';

function fixture({ reduced = false, gpu = true, delayedDevice = false, shaderError = false } = {}) {
  const saved = new Map();
  const replace = (key,value) => { saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{configurable:true,writable:true,value}); };
  let id = 0, destroyed = 0, submissions = 0, bufferDestroyed = 0, unconfigured = 0, finishDevice;
  const queue = new Map(), events = new Map(), motionEvents = new Map(), times = [], uniformFrames = [];
  const motion = { matches: reduced, addEventListener: (e,fn)=>motionEvents.set(e,fn), removeEventListener:(e)=>motionEvents.delete(e) };
  const context = { configure(){}, unconfigure(){unconfigured++}, getCurrentTexture:()=>({createView:()=>({})}) };
  const pass = {setPipeline(){},setBindGroup(){},draw(){},end(){}};
  const device = {
    limits:{maxTextureDimension2D:8192}, queue:{writeBuffer(buffer,offset,values){times.push(values[2]);uniformFrames.push(Array.from(values))},submit(){submissions++}},
    destroy(){destroyed++}, addEventListener(){}, lost:new Promise(()=>{}),
    createShaderModule:()=>({getCompilationInfo:async()=>({messages:shaderError?[{type:'error',lineNum:1,message:'invalid shader'}]:[]})}),
    createRenderPipelineAsync:async()=>({getBindGroupLayout:()=>({})}),
    createBuffer:()=>({destroy(){bufferDestroyed++}}),createBindGroup:()=>({}),
    createCommandEncoder:()=>({beginRenderPass:()=>pass,finish:()=>({})}),
  };
  const adapter = {requestDevice:()=>delayedDevice?new Promise(resolve=>{finishDevice=()=>resolve(device)}):Promise.resolve(device)};
  const document = {hidden:false,addEventListener:(e,fn)=>events.set(e,fn),removeEventListener:e=>events.delete(e)};
  replace('document',document);replace('window',{devicePixelRatio:2});
  replace('navigator',{gpu:gpu?{requestAdapter:async()=>adapter,getPreferredCanvasFormat:()=> 'bgra8unorm'}:undefined});
  replace('matchMedia',()=>motion);replace('GPUBufferUsage',{UNIFORM:64,COPY_DST:8});
  replace('requestAnimationFrame',fn=>{queue.set(++id,fn);return id});replace('cancelAnimationFrame',id=>queue.delete(id));
  replace('ResizeObserver',class{observe(){}disconnect(){}});
  const canvas = {dataset:{},style:{},width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({width:3000,height:2000})};
  return {
    canvas,document,motion,events,queue,times,uniformFrames,
    finishDevice:()=>finishDevice(),
    flush:async()=>{for(let i=0;i<10;i++)await Promise.resolve()},
    frame(now){const entries=[...queue.values()];queue.clear();for(const fn of entries)fn(now)},
    counts:()=>({destroyed,submissions,bufferDestroyed,unconfigured}),
    restore(){for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}},
  };
}
test('validates rendering controls at the config boundary',()=>{
  assert.equal(resolveConfig().fps,30);
  assert.equal(resolveConfig().bootAnimation,true);
  assert.equal(resolveConfig().bootDuration,2000);
  assert.equal(resolveConfig().bootRevealDelay,1200);
  assert.equal(resolveConfig().bootRevealDuration,800);
  for(const bad of [{fps:0},{speed:NaN},{pixelRatio:5},{intensity:Infinity},{bootDuration:100},{bootRevealDelay:-1},{bootRevealDuration:50},{bootAnimation:'yes'}])assert.throws(()=>resolveConfig(bad),/config\./);
});
test('renders with WebGPU, bounds resolution, suspends hidden tabs and frees resources',async()=>{
  const f=fixture();try{
    const stop=mountGalaxy(f.canvas,resolveConfig());await f.flush();f.frame(0);
    assert.equal(f.canvas.dataset.galaxyRenderer,'webgpu');assert.equal(f.counts().submissions,1);
    assert.ok(f.canvas.width<=1920&&f.canvas.height<=1200);
    f.frame(10);assert.equal(f.counts().submissions,1);f.frame(35);assert.equal(f.counts().submissions,2);
    f.document.hidden=true;f.events.get('visibilitychange')();assert.equal(f.queue.size,0);
    f.document.hidden=false;f.events.get('visibilitychange')();assert.equal(f.queue.size,1);
    stop();assert.equal(f.queue.size,0);assert.equal(f.events.size,0);
    assert.deepEqual(f.counts(),{destroyed:1,submissions:2,bufferDestroyed:1,unconfigured:1});
  }finally{f.restore()}
});
test('reduced motion and zero speed draw one static GPU frame',async()=>{
  for(const reduced of [true,false]){const f=fixture({reduced});try{
    const stop=mountGalaxy(f.canvas,resolveConfig({speed:reduced?0.35:0}));await f.flush();f.frame(0);
    assert.equal(f.canvas.dataset.galaxyRenderer,'webgpu-static');assert.equal(f.queue.size,0);stop();
  }finally{f.restore()}}
});
test('animation time advances at the configured speed and resumes without a hidden-tab jump',async()=>{
  const f=fixture();try{
    const stop=mountGalaxy(f.canvas,resolveConfig({speed:1}));await f.flush();
    f.frame(0);f.frame(50);f.frame(100);
    assert.ok(Math.abs(f.times.at(-1)-0.1)<0.00001);
    f.document.hidden=true;f.events.get('visibilitychange')();
    f.document.hidden=false;f.events.get('visibilitychange')();f.frame(10000);
    assert.ok(Math.abs(f.times.at(-1)-0.1)<0.00001);
    f.frame(10050);assert.ok(Math.abs(f.times.at(-1)-0.15)<0.00001);stop();
  }finally{f.restore()}
});
test('scheduled meteors reach the GPU uniforms and clear after fading',async()=>{
  const f=fixture();try{
    const stop=mountGalaxy(f.canvas,resolveConfig({meteorInterval:3}));await f.flush();
    for(let now=0;now<=6500;now+=50)f.frame(now);
    assert.ok(f.uniformFrames.every(frame=>frame.length===12));
    assert.ok(f.uniformFrames.slice(0,40).every(frame=>frame[10]===0),'initial pause must contain no streak');
    const streak=f.uniformFrames.findIndex(frame=>frame[10]>0.5);
    assert.ok(streak>=0,'a natural event must upload a bright meteor');
    assert.ok(f.uniformFrames.slice(streak+1).some(frame=>frame[10]===0),'finished event must clear its GPU data');
    stop();
  }finally{f.restore()}
});
test('an unsupported GPU or shader error leaves the static nebula available',async()=>{
  const warn=console.warn;console.warn=()=>{};
  try{for(const options of [{gpu:false},{shaderError:true}]){const f=fixture(options);try{
    const stop=mountGalaxy(f.canvas,resolveConfig());await f.flush();
    assert.equal(f.canvas.dataset.galaxyRenderer,'fallback');assert.equal(f.canvas.style.opacity,'0');assert.equal(f.queue.size,0);stop();
  }finally{f.restore()}}}finally{console.warn=warn}
});
test('disable during async device allocation destroys the late device and never starts a loop',async()=>{
  const f=fixture({delayedDevice:true});try{
    const stop=mountGalaxy(f.canvas,resolveConfig());await f.flush();stop();f.finishDevice();await f.flush();
    assert.equal(f.counts().destroyed,1);assert.equal(f.queue.size,0);assert.equal(f.canvas.dataset.galaxyRenderer,'disposed');
  }finally{f.restore()}
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('shipped client factory retains the skin through Host appearance hydration and cleans up on disable',async()=>{
  let plugin, current='system', palette={}, cancelled=0;
  const nodes=new Set(),effects=[];
  const createElement=(tag)=>{
    const node={tag,dataset:{},style:{setProperty(){}},setAttribute(){},append(child){node.child=child},addEventListener(){},removeEventListener(){},remove(){nodes.delete(node)}};
    return node;
  };
  const body={dataset:{},style:{setProperty(){},removeProperty(){}},prepend(node){nodes.add(node)},append(node){nodes.add(node)}};
  const sandbox={
    window:{__ModuleLoader__:{load({factory}){plugin=factory(()=>{throw Error('runtime imports must remain empty')})}},addEventListener(){},removeEventListener(){}},
    document:{body,head:{append(node){nodes.add(node)}},hidden:false,addEventListener(){},removeEventListener(){}},
    navigator:{},console:{warn(){}},
    matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),
    ResizeObserver:class{observe(){}disconnect(){}},
    requestAnimationFrame:()=>1,cancelAnimationFrame:()=>cancelled++,setTimeout:()=>1,clearTimeout(){},
  };
  sandbox.document.createElement=createElement;
  runInNewContext(readFileSync(new URL('../lib/client.js',import.meta.url),'utf8'),sandbox);
  assert.equal(typeof plugin.apply,'function');assert.deepEqual(Array.from(plugin.inject),['theme']);
  const ctx={
    theme:{
      getTheme:()=>({preference:current,active:{id:current}}),
      overrideTokens(source,values){assert.equal(source,'dsh-skin-galaxy');palette=values;return()=>{palette={}}},
    },
    effect(fn){const cleanup=fn();if(cleanup)effects.push(cleanup)},
  };
  plugin.apply(ctx);await Promise.resolve();await Promise.resolve();
  assert.equal(current,'system','skin must not persist an appearance preference');
  assert.equal(nodes.size,3);assert.equal(body.dataset.galaxyActive,'');
  for(current of ['light','dark','system']){
    assert.equal(palette['--dsw-alias-label-primary'].light,'#f4f6ff');
    assert.equal(palette['--dsw-alias-label-primary'].dark,'#f4f6ff');
    assert.equal(nodes.size,3,'Host appearance changes must not remove the GPU background');
  }
  for(const cleanup of effects.reverse())cleanup();
  assert.equal(nodes.size,0);assert.equal(Object.keys(palette).length,0);
  assert.equal(body.dataset.galaxyActive,undefined);assert.ok(cancelled>0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokens } from '../src/styles.ts';

const rgb = value => value.startsWith('#')
  ? value.slice(1).match(/../g).map(part => parseInt(part,16))
  : value.match(/[\d.]+/g).map(Number);
const luminance = color => rgb(color).slice(0,3).map(channel=>{
  const n=channel/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;
}).reduce((sum,n,index)=>sum+n*[0.2126,0.7152,0.0722][index],0);

test('normal and secondary text retain readable contrast even over a fully white dust lane',()=>{
  const surfaces=[tokens['--dsw-specific-sidebar-fill'],tokens['--dsw-specific-input-major'],'rgba(14,23,44,0.88)'];
  for(const surface of surfaces){
    const [r,g,b,a]=rgb(surface);
    const backing=`rgb(${[r,g,b].map(n=>n*a+255*(1-a)).join(',')})`;
    for(const token of ['--dsw-alias-label-primary','--dsw-alias-label-secondary','--dsw-alias-label-tertiary']){
      const ratio=(luminance(tokens[token])+0.05)/(luminance(backing)+0.05);
      assert.ok(ratio>=4.5,`${token} over ${surface}: ${ratio.toFixed(2)}:1`);
    }
  }
});
